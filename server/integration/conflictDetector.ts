import {
  FileConflict,
  StructuredFileChange,
  VirtualFile,
} from './types.js';
import { VirtualProjectFS } from './virtualFS.js';

export class ConflictDetector {
  /**
   * Analyzes an incoming batch of changes against the current virtual filesystem state.
   */
  public static detectConflicts(
    changes: StructuredFileChange[],
    vfs: VirtualProjectFS
  ): {
    hasConflicts: boolean;
    conflicts: FileConflict[];
    safeChanges: StructuredFileChange[];
  } {
    const conflicts: FileConflict[] = [];
    const safeChanges: StructuredFileChange[] = [];

    for (const change of changes) {
      const existingFile = vfs.getFile(change.path);

      if (!existingFile) {
        // Brand new file creation is inherently non-conflicting
        safeChanges.push(change);
        continue;
      }

      // Check for stale base version
      if (
        change.previousVersion !== undefined &&
        change.previousVersion < existingFile.version
      ) {
        conflicts.push({
          path: change.path,
          existingVersion: existingFile.version,
          attemptedBaseVersion: change.previousVersion,
          sourceTaskId: change.taskId,
          conflictingTaskId: existingFile.lastTaskId,
          conflictType: 'stale_base',
          reason: `Task ${change.taskId} modified ${change.path} based on version ${change.previousVersion}, but current version is ${existingFile.version} (authored by ${existingFile.lastTaskId}).`,
          resolution: 'repair_dispatched',
          diffSnippet: `Existing lines: ${existingFile.content.split('\n').length} vs incoming: ${change.content.split('\n').length}`,
        });
        continue;
      }

      // Check for destructive overwrite
      const oldLines = existingFile.content.split('\n');
      const newLines = change.content.split('\n');
      if (oldLines.length > 25 && newLines.length < oldLines.length * 0.35) {
        conflicts.push({
          path: change.path,
          existingVersion: existingFile.version,
          sourceTaskId: change.taskId,
          conflictingTaskId: existingFile.lastTaskId,
          conflictType: 'destructive_overwrite',
          reason: `Potential destructive overwrite: incoming content shrank from ${oldLines.length} lines to ${newLines.length} lines.`,
          resolution: 'repair_dispatched',
          diffSnippet: `Shrinkage: -${oldLines.length - newLines.length} lines`,
        });
        continue;
      }

      // Smart merge check for types/index.ts or shared barrel files:
      // If the file is a types barrel file, check if we can cleanly append or merge new exports
      if (change.path.endsWith('types/index.ts') || change.path.endsWith('types.ts')) {
        const mergedContent = ConflictDetector.mergeTypeScriptTypes(
          existingFile.content,
          change.content
        );
        if (mergedContent !== change.content) {
          safeChanges.push({
            ...change,
            content: mergedContent,
            description: `${change.description || 'Updated types'} (merged with existing contracts)`,
          });
          continue;
        }
      }

      // Standard safe modification
      safeChanges.push(change);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      safeChanges,
    };
  }

  /**
   * Intelligently merges type definitions without duplicating existing interfaces or types
   */
  private static mergeTypeScriptTypes(existing: string, incoming: string): string {
    const existingTypeNames = new Set<string>();
    const typeRegex = /export\s+(?:interface|type|enum)\s+([A-Za-z0-9_]+)/g;

    let match;
    while ((match = typeRegex.exec(existing)) !== null) {
      existingTypeNames.add(match[1]);
    }

    // Split incoming declarations
    const incomingBlocks = incoming.split(/(?=\nexport\s+(?:interface|type|enum)\s+)/g);
    const nonDuplicatedBlocks: string[] = [];

    for (const block of incomingBlocks) {
      const blockMatch = /export\s+(?:interface|type|enum)\s+([A-Za-z0-9_]+)/.exec(block);
      if (blockMatch && existingTypeNames.has(blockMatch[1])) {
        // Already exists in existing file, skip duplicate declaration to avoid TS errors
        continue;
      }
      nonDuplicatedBlocks.push(block.trim());
    }

    if (nonDuplicatedBlocks.length === 0) {
      return existing;
    }

    return `${existing.trim()}\n\n// Integrated exports from subsequent task\n${nonDuplicatedBlocks.join('\n\n')}\n`;
  }
}
