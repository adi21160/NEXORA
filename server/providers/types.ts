export type ProviderId = 'gemini' | 'openai' | 'claude' | 'other';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RateLimitState {
  isLimited: boolean;
  retryAfterSeconds?: number;
  lastError?: string;
  updatedAt: number;
}

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  hasCredentials: boolean;
  configuredEnvVar: string;
  maskedKey?: string; // e.g. "••••••••••••ABCD"
  lastValidatedAt?: number;
  models: {
    id: string;
    name: string;
    contextWindow: string;
    costPer1kPrompt: number;
    costPer1kCompletion: number;
  }[];
  rateLimit: RateLimitState;
  totalTokensConsumed: TokenUsage;
  totalRequests: number;
  lastUsedTimestamp?: number;
}

export interface GenerateTextOptions {
  model: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  responseFormatJson?: boolean;
  maxTokens?: number;
  retryCount?: number;
  userId?: string;
}

export interface GenerateTextResult {
  text: string;
  parsedJson?: any;
  model: string;
  provider: ProviderId;
  durationMs: number;
  usage: TokenUsage;
  rawResponse?: any;
}

export interface ValidateConnectionResult {
  valid: boolean;
  error?: string;
  latencyMs?: number;
  models?: string[];
}

export interface ConnectResult {
  provider: ProviderId;
  connected: boolean;
  maskedKey?: string;
  lastValidatedAt?: number;
  error?: string;
}

export interface AIProviderAdapter {
  id: ProviderId;
  name: string;
  configuredEnvVar: string;
  isConfigured(userId?: string): boolean;
  getStatus(userId?: string): ProviderStatus;
  connect?(userId: string, apiKey: string): Promise<ConnectResult>;
  validateConnection?(apiKey: string): Promise<ValidateConnectionResult>;
  disconnect?(userId: string): Promise<{ success: boolean }>;
  setApiKey(apiKey: string, userId?: string): void;
  supportsModel(modelId: string): boolean;
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
}
