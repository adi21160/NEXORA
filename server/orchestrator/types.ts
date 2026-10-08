export type TaskCategory =
  | 'architecture'
  | 'ui-design'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'testing'
  | 'security'
  | 'docs';

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface ProjectSpecification {
  name: string;
  summary: string;
  domain: string;
  architecturePattern: string;
  techStack: {
    framework: string;
    styling: string;
    language: string;
    icons: string;
    stateManagement: string;
  };
  dataModels: {
    name: string;
    fields: string[];
    description: string;
  }[];
  apiContracts: {
    endpoint: string;
    method: string;
    description: string;
    requestBody?: string;
    responseBody?: string;
  }[];
  securityRules: string[];
  uiGuidelines: string[];
  milestones: string[];
}

export interface ModelCapabilityConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'meta';
  supportedCategories: TaskCategory[];
  contextLimitTokens: number;
  costPer1kPrompt: number;
  costPer1kCompletion: number;
  historicalSuccessRate: number; // measured 0.0 - 1.0
  averageLatencyMs: number;
  maxParallelWorkers: number;
}

export interface RoutingEvaluationResult {
  assignedModelId: string;
  assignedProvider: string;
  fallbackModelId: string;
  fallbackProvider: string;
  routingReason: string;
  evaluatedCriteria: {
    categoryMatch: boolean;
    withinContextLimit: boolean;
    estimatedCost: number;
    providerAvailable: boolean;
    measuredEvaluationScore: number;
  };
}

export interface OrchestrationTask {
  id: string;
  projectId: string;
  title: string;
  category: TaskCategory;
  description: string;
  targetFiles: string[];
  dependencies: string[]; // Task IDs that must finish before this runs
  assignedModelId: string;
  assignedProvider: string;
  routingReason: string;
  fallbackModelId: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string;
  startTime?: number;
  completedTime?: number;
  durationMs?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  outputFiles: {
    path: string;
    content: string;
  }[];
  logs: string[];
  error?: string;
  errorType?: 'rate_limited' | 'missing_credentials' | 'execution_error';
  reassignedFromModel?: string;
}

export interface OrchestrationPlan {
  id: string;
  projectId: string;
  userId?: string;
  specification: ProjectSpecification;
  tasks: OrchestrationTask[];
  concurrencyLimit: number;
  totalEstimatedTokens: number;
  createdAt: number;
}

export interface OrchestrationProjectState {
  id: string;
  userId?: string;
  name: string;
  description: string;
  status: 'idle' | 'specifying' | 'planning' | 'running' | 'verifying' | 'paused' | 'completed' | 'failed';
  specification?: ProjectSpecification;
  tasks: OrchestrationTask[];
  activeWorkers: number;
  concurrencyLimit: number;
  files: Record<
    string,
    {
      path: string;
      content: string;
      language: string;
      lastModified: number;
      version: number;
    }
  >;
  totalTokens: number;
  totalCost: number;
  startTime?: number;
  completedTime?: number;
  systemLogs: string[];
  lastError?: string;
  integrationHealth?: number;
  activeConflicts?: number;
  brokenImports?: number;
  latestIntegrationReport?: any;
  sandboxReport?: any;
  maxRepairAttempts?: number;
}
