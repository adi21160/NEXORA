import crypto from 'crypto';
import {
  StructuredFileChange,
  VirtualFile,
  VirtualFileVersion,
  VirtualFileTreeNode,
} from './types.js';

export class VirtualProjectFS {
  private files: Map<string, VirtualFile> = new Map();
  private projectId: string;

  constructor(projectId: string, initialFiles?: Record<string, { content: string; language?: string; version?: number }>) {
    this.projectId = projectId;
    if (initialFiles) {
      for (const [rawPath, data] of Object.entries(initialFiles)) {
        const norm = this.normalizePath(rawPath);
        const checksum = this.computeChecksum(data.content);
        const version = data.version || 1;
        this.files.set(norm, {
          path: norm,
          content: data.content,
          language: data.language || this.detectLanguage(norm),
          version,
          lastModified: Date.now(),
          lastTaskId: 'initial',
          lastAuthorModel: 'system',
          checksum,
          history: [
            {
              version,
              content: data.content,
              taskId: 'initial',
              timestamp: Date.now(),
              commitMessage: 'Initial project file',
              authorModel: 'system',
              linesAdded: data.content.split('\n').length,
              linesRemoved: 0,
            },
          ],
        });
      }
    }
  }

  public normalizePath(rawPath: string): string {
    return rawPath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/{2,}/g, '/')
      .trim();
  }

  public detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      case 'svg':
        return 'xml';
      default:
        return 'plaintext';
    }
  }

  private computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  public getFile(filePath: string): VirtualFile | undefined {
    return this.files.get(this.normalizePath(filePath));
  }

  public hasFile(filePath: string): boolean {
    return this.files.has(this.normalizePath(filePath));
  }

  public getAllFiles(): Record<string, VirtualFile> {
    const record: Record<string, VirtualFile> = {};
    for (const [p, f] of this.files.entries()) {
      record[p] = { ...f };
    }
    return record;
  }

  public getFilePaths(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Applies structured file changes safely to the virtual filesystem.
   * Preserves unrelated files completely.
   */
  public applyChange(change: StructuredFileChange): {
    applied: boolean;
    file?: VirtualFile;
    isNew: boolean;
    version: number;
  } {
    const normPath = this.normalizePath(change.path);
    if (!normPath) return { applied: false, isNew: false, version: 0 };

    if (change.changeType === 'delete') {
      const existed = this.files.delete(normPath);
      return { applied: existed, isNew: false, version: 0 };
    }

    const existing = this.files.get(normPath);
    const checksum = this.computeChecksum(change.content);

    // If identical content, preserve version and timestamp
    if (existing && existing.checksum === checksum) {
      return {
        applied: true,
        file: existing,
        isNew: false,
        version: existing.version,
      };
    }

    const newLines = change.content.split('\n');
    const oldLines = existing ? existing.content.split('\n') : [];
    const linesAdded = Math.max(0, newLines.length - oldLines.length);
    const linesRemoved = Math.max(0, oldLines.length - newLines.length);

    const nextVersion = (existing?.version || 0) + 1;
    const historyItem: VirtualFileVersion = {
      version: nextVersion,
      content: change.content,
      taskId: change.taskId,
      timestamp: Date.now(),
      commitMessage: change.description || `Updated via ${change.taskTitle || change.taskId}`,
      authorModel: change.modelId,
      linesAdded: linesAdded > 0 ? linesAdded : newLines.length,
      linesRemoved,
    };

    const newHistory = existing ? [...existing.history, historyItem] : [historyItem];

    const updatedFile: VirtualFile = {
      path: normPath,
      content: change.content,
      language: this.detectLanguage(normPath),
      version: nextVersion,
      lastModified: Date.now(),
      lastTaskId: change.taskId,
      lastAuthorModel: change.modelId,
      checksum,
      history: newHistory,
    };

    this.files.set(normPath, updatedFile);

    return {
      applied: true,
      file: updatedFile,
      isNew: !existing,
      version: nextVersion,
    };
  }

  /**
   * Rolls back a file to a specific historical version
   */
  public rollbackFile(filePath: string, targetVersion: number): boolean {
    const norm = this.normalizePath(filePath);
    const file = this.files.get(norm);
    if (!file) return false;

    const hist = file.history.find((h) => h.version === targetVersion);
    if (!hist) return false;

    file.content = hist.content;
    file.checksum = this.computeChecksum(hist.content);
    file.version = file.version + 1;
    file.lastModified = Date.now();
    file.lastTaskId = 'rollback';
    file.history.push({
      version: file.version,
      content: hist.content,
      taskId: 'rollback',
      timestamp: Date.now(),
      commitMessage: `Reverted to version ${targetVersion}`,
      authorModel: 'system',
      linesAdded: 0,
      linesRemoved: 0,
    });

    return true;
  }

  /**
   * Builds a directory tree structure for UI navigation
   */
  public getFileTree(): VirtualFileTreeNode[] {
    const root: { [key: string]: any } = {};

    for (const [filePath, file] of this.files.entries()) {
      const parts = filePath.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          current[part] = {
            name: part,
            path: filePath,
            type: 'file',
            version: file.version,
          };
        } else {
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, i + 1).join('/'),
              type: 'directory',
              children: {},
            };
          }
          current = current[part].children;
        }
      }
    }

    const convert = (node: any): VirtualFileTreeNode[] => {
      return Object.values(node).map((item: any) => {
        if (item.type === 'directory') {
          return {
            name: item.name,
            path: item.path,
            type: 'directory',
            children: convert(item.children),
          };
        }
        return {
          name: item.name,
          path: item.path,
          type: 'file',
          version: item.version,
        };
      });
    };

    return convert(root);
  }
}
