import path from 'path';
import { BrokenImport, ValidationReport } from './types.js';
import { VirtualProjectFS } from './virtualFS.js';

interface ExportedSymbolMap {
  defaultExport: boolean;
  namedExports: Set<string>;
}

export class ImportExportValidator {
  /**
   * Validates all imports and exports across the virtual filesystem.
   */
  public static validate(vfs: VirtualProjectFS): ValidationReport {
    const brokenImports: BrokenImport[] = [];
    const syntaxIssues: { path: string; error: string }[] = [];
    const files = vfs.getAllFiles();

    // 1. Build an index of exports for all TS/JS files
    const exportIndex = new Map<string, ExportedSymbolMap>();

    for (const [filePath, file] of Object.entries(files)) {
      if (
        filePath.endsWith('.ts') ||
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.jsx')
      ) {
        exportIndex.set(filePath, this.extractExports(file.content));
      }
    }

    // 2. Validate imports in each file
    for (const [filePath, file] of Object.entries(files)) {
      if (
        !filePath.endsWith('.ts') &&
        !filePath.endsWith('.tsx') &&
        !filePath.endsWith('.js') &&
        !filePath.endsWith('.jsx')
      ) {
        continue;
      }

      const imports = this.extractImports(file.content);

      for (const imp of imports) {
        // Skip external package imports (handled by DependencyManager)
        if (!imp.source.startsWith('.') && !imp.source.startsWith('@/')) {
          continue;
        }

        const resolved = this.resolveImportPath(filePath, imp.source, vfs);

        if (!resolved) {
          brokenImports.push({
            importerPath: filePath,
            importedPath: imp.source,
            resolvedPath: null,
            importedSymbol: imp.symbols.join(', ') || 'default',
            errorType: 'file_not_found',
            suggestion: `Check relative path from ${filePath} or ensure target file is created.`,
          });
          continue;
        }

        const exports = exportIndex.get(resolved);
        if (!exports) continue;

        // Check default import
        if (imp.hasDefault && !exports.defaultExport) {
          brokenImports.push({
            importerPath: filePath,
            importedPath: imp.source,
            resolvedPath: resolved,
            importedSymbol: 'default',
            errorType: 'symbol_not_exported',
            suggestion: `Target file "${resolved}" does not have an "export default". Export default function/component or use named import.`,
          });
        }

        // Check named imports
        for (const named of imp.symbols) {
          if (!exports.namedExports.has(named) && named !== 'type') {
            brokenImports.push({
              importerPath: filePath,
              importedPath: imp.source,
              resolvedPath: resolved,
              importedSymbol: named,
              errorType: 'symbol_not_exported',
              suggestion: `Target "${resolved}" exports [${Array.from(exports.namedExports).slice(0, 6).join(', ')}] but not "${named}".`,
            });
          }
        }
      }
    }

    return {
      valid: brokenImports.length === 0 && syntaxIssues.length === 0,
      brokenImports,
      apiMismatches: [],
      missingDependencies: [],
      syntaxIssues,
    };
  }

  /**
   * Resolves a relative import path to an actual file in the virtual filesystem.
   */
  public static resolveImportPath(
    importerPath: string,
    importSource: string,
    vfs: VirtualProjectFS
  ): string | null {
    let target = '';

    if (importSource.startsWith('@/')) {
      target = importSource.replace('@/', '');
    } else {
      const importerDir = path.dirname(importerPath);
      target = path.normalize(path.join(importerDir, importSource)).replace(/\\/g, '/');
    }

    // Try direct exact match
    if (vfs.hasFile(target)) return target;

    // Try standard extensions
    const candidates = [
      `${target}.tsx`,
      `${target}.ts`,
      `${target}.jsx`,
      `${target}.js`,
      `${target}.json`,
      `${target}/index.tsx`,
      `${target}/index.ts`,
      `${target}/index.jsx`,
      `${target}/index.js`,
    ];

    for (const cand of candidates) {
      if (vfs.hasFile(cand)) return cand;
    }

    return null;
  }

  /**
   * Extracts exported symbols from file source code
   */
  public static extractExports(content: string): ExportedSymbolMap {
    const namedExports = new Set<string>();
    let defaultExport = false;

    // Check default export
    if (
      /export\s+default\s+/m.test(content) ||
      /export\s*\{\s*[^}]*\bas\s+default\b/m.test(content)
    ) {
      defaultExport = true;
    }

    // Named functions, classes, const, let, var
    const declRegex =
      /export\s+(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z0-9_]+)/g;
    let match;
    while ((match = declRegex.exec(content)) !== null) {
      namedExports.add(match[1]);
    }

    // Named export clauses: export { foo, bar as baz }
    const clauseRegex = /export\s*\{([^}]+)\}/g;
    while ((match = clauseRegex.exec(content)) !== null) {
      const clause = match[1];
      const items = clause.split(',');
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (trimmed.includes(' as ')) {
          const parts = trimmed.split(/\s+as\s+/);
          if (parts[1]?.trim() === 'default') {
            defaultExport = true;
          } else if (parts[1]) {
            namedExports.add(parts[1].trim());
          }
        } else {
          namedExports.add(trimmed);
        }
      }
    }

    return { defaultExport, namedExports };
  }

  /**
   * Extracts imported symbols and sources from file content
   */
  public static extractImports(content: string): {
    source: string;
    hasDefault: boolean;
    symbols: string[];
  }[] {
    const imports: { source: string; hasDefault: boolean; symbols: string[] }[] = [];

    // Match imports like: import Def, { A, B } from '...'
    const importRegex =
      /import\s+(?:type\s+)?(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\{([^}]+)\})?\s*from\s*['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const defaultImport = match[1]?.trim();
      const namedBlock = match[2]?.trim();
      const source = match[3]?.trim();

      const symbols: string[] = [];
      if (namedBlock) {
        const rawItems = namedBlock.split(',');
        for (const it of rawItems) {
          const clean = it.trim().replace(/^type\s+/, '');
          if (!clean) continue;
          if (clean.includes(' as ')) {
            symbols.push(clean.split(/\s+as\s+/)[0].trim());
          } else {
            symbols.push(clean);
          }
        }
      }

      imports.push({
        source,
        hasDefault: Boolean(defaultImport && defaultImport !== 'type'),
        symbols,
      });
    }

    return imports;
  }
}
