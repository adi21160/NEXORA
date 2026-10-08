import { MissingDependency } from './types.js';
import { ImportExportValidator } from './importExportValidator.js';
import { VirtualProjectFS } from './virtualFS.js';

const KNOWN_PACKAGE_VERSIONS: Record<string, string> = {
  'lucide-react': '^0.546.0',
  'motion': '^12.23.24',
  'framer-motion': '^12.4.7',
  'react': '^19.0.1',
  'react-dom': '^19.0.1',
  'clsx': '^2.1.1',
  'tailwind-merge': '^3.0.2',
  'canvas-confetti': '^1.9.4',
  'date-fns': '^4.1.0',
  'zustand': '^5.0.3',
  'axios': '^1.8.1',
  'lodash': '^4.17.21',
  'dotenv': '^17.2.3',
};

export class DependencyManager {
  /**
   * Scans project imports and ensures package.json in the virtual filesystem is consistent
   */
  public static syncDependencies(vfs: VirtualProjectFS): MissingDependency[] {
    const missing: MissingDependency[] = [];
    const files = vfs.getAllFiles();

    // 1. Collect all external package imports
    const externalImports = new Map<string, string>(); // pkg -> importingFile

    for (const [filePath, file] of Object.entries(files)) {
      if (
        !filePath.endsWith('.ts') &&
        !filePath.endsWith('.tsx') &&
        !filePath.endsWith('.js') &&
        !filePath.endsWith('.jsx')
      ) {
        continue;
      }

      const imports = ImportExportValidator.extractImports(file.content);
      for (const imp of imports) {
        // If not relative and not internal alias
        if (
          !imp.source.startsWith('.') &&
          !imp.source.startsWith('/') &&
          !imp.source.startsWith('@/')
        ) {
          // Normalize scoped package or subpath: e.g. "lucide-react" from "lucide-react/dist/..."
          const pkgName = imp.source.startsWith('@')
            ? imp.source.split('/').slice(0, 2).join('/')
            : imp.source.split('/')[0];

          if (pkgName && !externalImports.has(pkgName)) {
            externalImports.set(pkgName, filePath);
          }
        }
      }
    }

    // 2. Read or initialize virtual package.json
    let pkgJson: any = {
      name: 'generated-project',
      version: '1.0.0',
      private: true,
      dependencies: {
        react: '^19.0.1',
        'react-dom': '^19.0.1',
        'lucide-react': '^0.546.0',
      },
      devDependencies: {
        typescript: '^5.7.0',
        tailwindcss: '^4.0.0',
      },
    };

    const existingPkgFile = vfs.getFile('package.json');
    if (existingPkgFile) {
      try {
        pkgJson = JSON.parse(existingPkgFile.content);
      } catch (err) {
        console.warn('[DependencyManager] Could not parse existing package.json, reinitializing.');
      }
    }

    if (!pkgJson.dependencies) pkgJson.dependencies = {};
    if (!pkgJson.devDependencies) pkgJson.devDependencies = {};

    let modified = false;

    // 3. Reconcile external imports with dependencies
    for (const [pkg, importingFile] of externalImports.entries()) {
      const inDeps = Boolean(pkgJson.dependencies[pkg] || pkgJson.devDependencies[pkg]);

      if (!inDeps) {
        const suggestedVersion = KNOWN_PACKAGE_VERSIONS[pkg] || '^1.0.0';
        pkgJson.dependencies[pkg] = suggestedVersion;
        modified = true;

        missing.push({
          moduleName: pkg,
          requiredBy: importingFile,
          suggestedVersion,
          addedToPackageJson: true,
        });
      }
    }

    // 4. If dependencies were added, apply package.json update to VirtualProjectFS
    if (modified || !existingPkgFile) {
      const sortedDeps: Record<string, string> = {};
      Object.keys(pkgJson.dependencies)
        .sort()
        .forEach((k) => {
          sortedDeps[k] = pkgJson.dependencies[k];
        });
      pkgJson.dependencies = sortedDeps;

      const formatted = JSON.stringify(pkgJson, null, 2);

      vfs.applyChange({
        taskId: 'dependency-manager',
        taskTitle: 'Sync Project Dependencies',
        modelId: 'system-integrator',
        path: 'package.json',
        changeType: existingPkgFile ? 'modify' : 'create',
        content: formatted,
        description: `Automated dependency reconciliation: ensured ${externalImports.size} package(s) configured.`,
      });
    }

    return missing;
  }
}
