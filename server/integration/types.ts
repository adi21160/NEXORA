export interface VirtualFileVersion {
  version: number;
  content: string;
  taskId: string;
  timestamp: number;
  commitMessage: string;
  authorModel: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface VirtualFile {
  path: string;
  content: string;
  language: string;
  version: number;
  lastModified: number;
  lastTaskId: string;
  lastAuthorModel: string;
  checksum: string;
  history: VirtualFileVersion[];
}

export interface StructuredFileChange {
  taskId: string;
  taskTitle: string;
  modelId: string;
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  content: string;
  previousVersion?: number;
  description?: string;
}

export type ConflictType =
  | 'concurrent_write'
  | 'stale_base'
  | 'destructive_overwrite'
  | 'broken_contract';

export interface FileConflict {
  path: string;
  existingVersion: number;
  attemptedBaseVersion?: number;
  sourceTaskId: string;
  conflictingTaskId: string;
  conflictType: ConflictType;
  reason: string;
  resolution: 'accepted_newer' | 'merged' | 'rejected' | 'repair_dispatched';
  diffSnippet?: string;
}

export interface BrokenImport {
  importerPath: string;
  importedPath: string;
  resolvedPath: string | null;
  importedSymbol: string;
  errorType: 'file_not_found' | 'symbol_not_exported' | 'invalid_path_syntax';
  suggestion?: string;
}

export interface ApiContractIssue {
  clientPath: string;
  endpoint: string;
  method: string;
  issue: string;
  expectedContract?: string;
}

export interface MissingDependency {
  moduleName: string;
  requiredBy: string;
  suggestedVersion: string;
  addedToPackageJson: boolean;
}

export interface ValidationReport {
  valid: boolean;
  brokenImports: BrokenImport[];
  apiMismatches: ApiContractIssue[];
  missingDependencies: MissingDependency[];
  syntaxIssues: { path: string; error: string }[];
}

export interface TargetedRepairTask {
  repairTaskId: string;
  parentTaskId: string;
  targetFile: string;
  issueType: 'missing_export' | 'broken_import' | 'api_mismatch' | 'dependency_error' | 'syntax_error';
  description: string;
  assignedModel: string;
  assignedProvider: string;
  requiredFix: string;
  createdAt: number;
  status: 'pending' | 'executing' | 'resolved' | 'failed';
}

export interface IntegrationReport {
  id: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  timestamp: number;
  appliedFiles: { path: string; changeType: string; version: number }[];
  conflicts: FileConflict[];
  validation: ValidationReport;
  targetedRepairTasks: TargetedRepairTask[];
  healthScore: number; // 0 - 100
  summary: string;
}

export interface VirtualFileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  version?: number;
  children?: VirtualFileTreeNode[];
}
