import OpenAI from 'openai';
import {
  AIProviderAdapter,
  ConnectResult,
  GenerateTextOptions,
  GenerateTextResult,
  ProviderId,
  ProviderStatus,
  RateLimitState,
  TokenUsage,
  ValidateConnectionResult,
} from './types.js';
import { CredentialVault } from './credentialVault.js';

export class OpenAIProviderAdapter implements AIProviderAdapter {
  public readonly id: ProviderId = 'openai';
  public readonly name = 'OpenAI';
  public readonly configuredEnvVar = 'OPENAI_API_KEY';

  // In-memory client cache per user: userId -> OpenAI instance
  private userClients: Map<string, { client: OpenAI; cachedKey: string }> = new Map();
  // Default system fallback client if process.env.OPENAI_API_KEY exists
  private systemClient: OpenAI | null = null;
  private systemApiKey: string = '';

  private rateLimitState: RateLimitState = {
    isLimited: false,
    updatedAt: Date.now(),
  };

  private totalTokens: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  private totalRequests = 0;
  private lastUsedTimestamp?: number;

  private supportedModels = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Omni)',
      contextWindow: '128,000 tokens',
      costPer1kPrompt: 0.0025,
      costPer1kCompletion: 0.01,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      contextWindow: '128,000 tokens',
      costPer1kPrompt: 0.00015,
      costPer1kCompletion: 0.0006,
    },
  ];

  constructor(initialApiKey?: string) {
    const key = initialApiKey || process.env.OPENAI_API_KEY || '';
    if (key) {
      this.systemApiKey = key.trim();
      this.systemClient = new OpenAI({ apiKey: this.systemApiKey });
    }
  }

  /**
   * Checks whether OpenAI is configured and available for a given user.
   */
  public isConfigured(userId: string = 'default-user'): boolean {
    // Check if user has an encrypted credential stored in the vault
    const userMeta = CredentialVault.getCredentialMetadata(userId, 'openai');
    if (userMeta && userMeta.connectionStatus === 'connected') {
      return true;
    }
    // Fallback to system environment variable
    return Boolean(this.systemApiKey && this.systemClient);
  }

  /**
   * Sets temporary in-memory key (e.g. for environment/system setup)
   */
  public setApiKey(apiKey: string, userId: string = 'default-user'): void {
    const clean = apiKey.trim();
    if (clean) {
      this.systemApiKey = clean;
      this.systemClient = new OpenAI({ apiKey: clean });
      this.rateLimitState = { isLimited: false, updatedAt: Date.now() };
    } else {
      this.systemApiKey = '';
      this.systemClient = null;
      this.userClients.delete(userId);
    }
  }

  /**
   * Validates key format and makes a real authenticated probe call to OpenAI API.
   */
  public async validateConnection(apiKey: string): Promise<ValidateConnectionResult> {
    const cleanKey = apiKey.trim();

    // 1. Format plausibility check
    if (!cleanKey || cleanKey.length < 10) {
      return {
        valid: false,
        error: 'Invalid OpenAI API key. Please check your key and try again.',
      };
    }

    const startTime = Date.now();
    try {
      const probeClient = new OpenAI({
        apiKey: cleanKey,
        timeout: 12000,
        maxRetries: 0,
      });

      // Real server-side authenticated test request
      const list = await probeClient.models.list();
      const latencyMs = Date.now() - startTime;
      const modelNames = list.data?.map((m) => m.id) || [];

      return {
        valid: true,
        latencyMs,
        models: modelNames.slice(0, 10),
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const status = err?.status || err?.statusCode || err?.response?.status;
      const msg = String(err?.message || err);

      if (status === 401 || msg.includes('401') || msg.includes('Incorrect API key') || msg.includes('invalid_api_key')) {
        return {
          valid: false,
          error: 'Invalid OpenAI API key. Please check your key and try again.',
          latencyMs,
        };
      }

      if (status === 429 || msg.includes('429') || msg.includes('insufficient_quota')) {
        return {
          valid: false,
          error: 'OpenAI rate limit or quota exceeded. Please check your billing status.',
          latencyMs,
        };
      }

      return {
        valid: false,
        error: 'Unable to connect to OpenAI. Please try again later.',
        latencyMs,
      };
    }
  }

  /**
   * Connects a user's OpenAI API key securely:
   * 1. Validates with real authenticated request.
   * 2. Encrypts credential at rest in the vault.
   * 3. Updates user's in-memory client.
   * 4. Returns ONLY sanitized connection status (NEVER the plaintext or encrypted key).
   */
  public async connect(userId: string, apiKey: string): Promise<ConnectResult> {
    if (!userId || !userId.trim()) {
      throw new Error('User authentication required to connect OpenAI.');
    }

    const validation = await this.validateConnection(apiKey);

    if (!validation.valid) {
      return {
        provider: 'openai',
        connected: false,
        error: validation.error || 'Invalid OpenAI API key. Please check your key and try again.',
      };
    }

    // Encrypt at rest in CredentialVault
    const saved = CredentialVault.saveCredential(
      userId,
      'openai',
      apiKey,
      validation.models
    );

    // Update in-memory user client
    this.userClients.set(userId, {
      client: new OpenAI({ apiKey: apiKey.trim() }),
      cachedKey: apiKey.trim(),
    });

    this.rateLimitState = { isLimited: false, updatedAt: Date.now() };

    return {
      provider: 'openai',
      connected: true,
      maskedKey: saved.maskedKey,
      lastValidatedAt: saved.lastValidatedAt,
    };
  }

  /**
   * Tests the OpenAI connection using the user's securely stored credentials or provided key.
   */
  public async testConnection(
    userId: string = 'default-user',
    probeKey?: string
  ): Promise<{ success: boolean; message: string; latencyMs?: number; error?: string }> {
    const keyToTest = probeKey || CredentialVault.getDecryptedKey(userId, 'openai') || this.systemApiKey;
    if (!keyToTest) {
      return {
        success: false,
        message: 'OpenAI connection failed',
        error: 'No OpenAI API key connected. Please connect your API key first.',
      };
    }

    const validation = await this.validateConnection(keyToTest);
    if (validation.valid) {
      return {
        success: true,
        message: 'OpenAI connection working',
        latencyMs: validation.latencyMs,
      };
    } else {
      return {
        success: false,
        message: 'OpenAI connection failed',
        error: validation.error || 'Unable to connect to OpenAI.',
      };
    }
  }

  /**
   * Disconnects a user's OpenAI credential:
   * 1. Deletes encrypted key from storage.
   * 2. Evicts memory client.
   * 3. Marks disconnected.
   */
  public async disconnect(userId: string): Promise<{ success: boolean }> {
    if (!userId) return { success: false };

    CredentialVault.deleteCredential(userId, 'openai');
    this.userClients.delete(userId);
    return { success: true };
  }

  /**
   * Resolves or instantiates an authenticated OpenAI client for the user.
   * Decrypts the key strictly in memory.
   */
  private getClientForUser(userId: string = 'default-user'): OpenAI {
    const cached = this.userClients.get(userId);
    if (cached) {
      return cached.client;
    }

    // Decrypt from vault
    const decryptedKey = CredentialVault.getDecryptedKey(userId, 'openai');
    if (decryptedKey) {
      const client = new OpenAI({ apiKey: decryptedKey });
      this.userClients.set(userId, { client, cachedKey: decryptedKey });
      return client;
    }

    // System fallback if available
    if (this.systemClient) {
      return this.systemClient;
    }

    throw new Error(
      'OpenAI provider credentials missing or disconnected. Please connect your OpenAI API key in the AI Models panel.'
    );
  }

  public supportsModel(modelId: string): boolean {
    return this.supportedModels.some((m) => m.id === modelId) || modelId.startsWith('gpt-');
  }

  /**
   * Returns provider status for a user. Never exposes the plaintext key.
   */
  public getStatus(userId: string = 'default-user'): ProviderStatus {
    const userMeta = CredentialVault.getCredentialMetadata(userId, 'openai');
    const hasUserCreds = Boolean(userMeta && userMeta.connectionStatus === 'connected');
    const hasSystemCreds = Boolean(this.systemApiKey && this.systemClient);

    const masked = userMeta?.maskedKey || (hasSystemCreds ? CredentialVault.maskApiKey(this.systemApiKey) : undefined);

    return {
      id: this.id,
      name: this.name,
      hasCredentials: hasUserCreds || hasSystemCreds,
      configuredEnvVar: this.configuredEnvVar,
      maskedKey: masked,
      lastValidatedAt: userMeta?.lastValidatedAt,
      models: this.supportedModels,
      rateLimit: this.rateLimitState,
      totalTokensConsumed: { ...this.totalTokens },
      totalRequests: this.totalRequests,
      lastUsedTimestamp: this.lastUsedTimestamp,
    };
  }

  /**
   * Executes model generation server-side.
   */
  public async generate(options: GenerateTextOptions): Promise<GenerateTextResult> {
    return this.generateText(options);
  }

  public async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const userId = options.userId || 'default-user';
    const client = this.getClientForUser(userId);

    const modelName = options.model || 'gpt-4o';
    const maxRetries = options.retryCount ?? 2;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      const startTime = Date.now();
      try {
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (options.systemInstruction) {
          messages.push({ role: 'system', content: options.systemInstruction });
        }
        messages.push({ role: 'user', content: options.prompt });

        const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model: modelName,
          messages,
          temperature: options.temperature ?? 0.7,
        };

        if (options.responseFormatJson) {
          requestParams.response_format = { type: 'json_object' };
        }
        if (options.maxTokens) {
          requestParams.max_tokens = options.maxTokens;
        }

        const completion = await client.chat.completions.create(requestParams);

        const durationMs = Date.now() - startTime;
        const text = completion.choices[0]?.message?.content || '';

        const promptTokens = completion.usage?.prompt_tokens || 0;
        const completionTokens = completion.usage?.completion_tokens || 0;
        const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;

        const usage: TokenUsage = {
          promptTokens,
          completionTokens,
          totalTokens,
        };

        this.totalTokens.promptTokens += promptTokens;
        this.totalTokens.completionTokens += completionTokens;
        this.totalTokens.totalTokens += totalTokens;
        this.totalRequests += 1;
        this.lastUsedTimestamp = Date.now();
        this.rateLimitState = { isLimited: false, updatedAt: Date.now() };

        let parsedJson: any = undefined;
        if (options.responseFormatJson) {
          try {
            const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsedJson = JSON.parse(cleaned);
          } catch (jsonErr: any) {
            console.warn(`[OpenAIAdapter] JSON parse warning: ${jsonErr.message}`);
          }
        }

        return {
          text,
          parsedJson,
          model: modelName,
          provider: this.id,
          durationMs,
          usage,
          rawResponse: completion,
        };
      } catch (err: any) {
        lastError = err;
        attempt++;

        const errMsg = String(err?.message || err);
        const status = err?.status || err?.statusCode;
        const isRateLimit =
          status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('rate_limit') ||
          errMsg.includes('insufficient_quota');

        if (status === 401 || errMsg.includes('401') || errMsg.includes('invalid_api_key')) {
          CredentialVault.updateConnectionStatus(userId, 'openai', 'invalid');
          throw new Error('Invalid OpenAI API key. Please check your key and try again.');
        }

        if (isRateLimit) {
          this.rateLimitState = {
            isLimited: true,
            retryAfterSeconds: 30,
            lastError: 'OpenAI rate limit or quota exceeded. Switching to fallback provider.',
            updatedAt: Date.now(),
          };
          console.warn(`[OpenAIAdapter] Rate limit triggered (attempt ${attempt}/${maxRetries})`);
        }

        if (attempt <= maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 6000);
          await new Promise((res) => setTimeout(res, backoffMs));
        }
      }
    }

    const sanitizedError = lastError?.message || 'OpenAI request failed after retries.';
    throw new Error(sanitizedError);
  }
}

// Alias for standard Provider naming
export const OpenAIProvider = OpenAIProviderAdapter;
