export type AIModelId =
  | 'gemini-3.8-flash'
  | 'claude-3-7-sonnet'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'deepseek-r1'
  | 'gemini-3-1-pro'
  | 'llama-3-3-70b';

export type TaskCategory =
  | 'architecture'
  | 'ui-design'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'api'
  | 'auth'
  | 'security'
  | 'optimization'
  | 'debugging'
  | 'testing'
  | 'docs';

export type ModelConnectionStatus =
  | 'connected'
  | 'ready'
  | 'needs_key'
  | 'rate_limited'
  | 'disabled';

export interface AIModel {
  id: AIModelId;
  name: string;
  provider: 'Google' | 'Anthropic' | 'OpenAI' | 'DeepSeek' | 'Meta';
  avatar: string;
  badgeColor: string;
  specialty: string;
  status: ModelConnectionStatus;
  contextWindow: string;
  latencyMs: number;
  costPer1kTokens: number;
  supportedCategories: TaskCategory[];
  rpmLimit: number;
  currentRPM: number;
  enabled: boolean;
  priority: number;
  totalRequests: number;
  totalTokens: number;
  isFallbackOnly?: boolean;
}

export type TaskStatus =
  | 'pending'
  | 'planning'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export interface ProjectTask {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  assignedModel: AIModelId;
  fallbackModel: AIModelId;
  status: TaskStatus;
  dependencies: string[];
  targetFiles: string[];
  progress: number;
  retryCount: number;
  maxRetries: number;
  logs: string[];
  errorMsg?: string;
  startTime?: number;
  completedTime?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executedByModel?: string;
  fallbackTriggered?: boolean;
  routingReason?: string;
  idempotencyKey?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'html' | 'css' | 'json' | 'markdown';
  lastModified: number;
  createdByTask: string;
  version: number;
}

export interface TestCheckItem {
  id: string;
  category: 'syntax' | 'typecheck' | 'contract' | 'security' | 'accessibility' | 'build';
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  message: string;
  file?: string;
  line?: number;
  autoRepairable: boolean;
}

export interface ProjectSettings {
  generationSpeed: 'fast' | 'balanced' | 'quality';
  costOptimization: boolean;
  maxRetries: number;
  autoRepair: boolean;
  budgetCap: number; // e.g. 5.00 USD
  preferredModels: Partial<Record<TaskCategory, AIModelId>>;
}

export interface ProjectStats {
  totalTokens: number;
  estimatedCost: number;
  elapsedSeconds: number;
  modelsUsed: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'Website' | 'Web App' | 'Dashboard' | 'SaaS Product' | 'E-commerce' | 'Portfolio' | 'Custom';
  stack: string;
  design: string;
  functionalRequirements: string;
  backendRequirements: string;
  authRequirements: string;
  deploymentPreferences?: string;
  status: 'draft' | 'planning' | 'generating' | 'running' | 'verifying' | 'paused' | 'testing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  tasks: ProjectTask[];
  files: Record<string, ProjectFile>;
  testResults: TestCheckItem[];
  activeFile: string;
  settings: ProjectSettings;
  stats: ProjectStats;
  version: number;
  specification?: any;
  concurrencyLimit?: number;
  integrationHealth?: number;
  activeConflicts?: number;
  brokenImports?: number;
  latestIntegrationReport?: any;
  sandboxReport?: any;
}

export interface ModelActivity {
  id: string;
  timestamp: number;
  modelId: AIModelId;
  modelName: string;
  taskId: string;
  taskTitle: string;
  type: 'prompt' | 'thinking' | 'generating' | 'fallback' | 'completed' | 'error' | 'repaired';
  message: string;
  tokens?: number;
  durationMs?: number;
}

export interface QuotaStats {
  totalApiRequests: number;
  totalTokensConsumed: number;
  totalEstimatedCost: number;
  spendingLimit: number;
  rateLimitIncidents: number;
  activeFallbacks: number;
  modelBreakdown: Record<string, { requests: number; tokens: number; cost: number }>;
  categoryBreakdown: Record<string, number>;
}
