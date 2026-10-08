export interface CompilationError {
  file: string;
  line?: number;
  column?: number;
  code?: string;
  message: string;
  rawSnippet?: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'smoke' | 'security' | 'contract';
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  file?: string;
  message: string;
  errorDetails?: string;
}

export interface SandboxExecutionOptions {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  maxRepairAttempts?: number; // default 3
  timeoutMs?: number; // default 20000
  runTests?: boolean; // default true
  preferredModel?: string;
}

export interface SandboxReport {
  id: string;
  projectId: string;
  timestamp: number;
  overallPassed: boolean;
  attemptCount: number;
  maxAttempts: number;
  sandboxDirectory: string;
  installPhase: {
    success: boolean;
    durationMs: number;
    logs: string;
  };
  buildPhase: {
    success: boolean;
    durationMs: number;
    logs: string;
    compilationErrors: CompilationError[];
    failingFiles: string[];
  };
  testPhase: {
    success: boolean;
    durationMs: number;
    logs: string;
    tests: TestResultItem[];
    passedCount: number;
    failedCount: number;
  };
  repairHistory: {
    attempt: number;
    failingFiles: string[];
    repairsDispatched: number;
    outcome: 'resolved' | 'still_failing';
    summary: string;
    timestamp: number;
  }[];
  summary: string;
}
