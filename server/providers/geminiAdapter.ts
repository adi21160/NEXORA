import { GoogleGenAI } from '@google/genai';
import {
  AIProviderAdapter,
  GenerateTextOptions,
  GenerateTextResult,
  ProviderId,
  ProviderStatus,
  RateLimitState,
  TokenUsage,
} from './types.js';

export class GeminiProviderAdapter implements AIProviderAdapter {
  public readonly id: ProviderId = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly configuredEnvVar = 'GEMINI_API_KEY';

  private client: GoogleGenAI | null = null;
  private apiKey: string = '';
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
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      contextWindow: '1,048,576 tokens',
      costPer1kPrompt: 0.0001,
      costPer1kCompletion: 0.0004,
    },
    {
      id: 'gemini-3.1-pro',
      name: 'Gemini 3.1 Pro',
      contextWindow: '2,097,152 tokens',
      costPer1kPrompt: 0.00125,
      costPer1kCompletion: 0.005,
    },
  ];

  constructor(initialApiKey?: string) {
    const key = initialApiKey || process.env.GEMINI_API_KEY || '';
    if (key) {
      this.setApiKey(key);
    }
  }

  public isConfigured(): boolean {
    return !!this.apiKey && !!this.client;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey.trim();
    if (this.apiKey) {
      this.client = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      // Clear rate limit lock on key reset
      this.rateLimitState = { isLimited: false, updatedAt: Date.now() };
    } else {
      this.client = null;
    }
  }

  public supportsModel(modelId: string): boolean {
    return this.supportedModels.some((m) => m.id === modelId);
  }

  public getStatus(): ProviderStatus {
    return {
      id: this.id,
      name: this.name,
      hasCredentials: this.isConfigured(),
      configuredEnvVar: this.configuredEnvVar,
      models: this.supportedModels,
      rateLimit: this.rateLimitState,
      totalTokensConsumed: { ...this.totalTokens },
      totalRequests: this.totalRequests,
      lastUsedTimestamp: this.lastUsedTimestamp,
    };
  }

  public async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    if (!this.isConfigured() || !this.client) {
      throw new Error(
        `Gemini provider credentials missing. Please set ${this.configuredEnvVar} in your environment or Settings panel.`
      );
    }

    const modelName = options.model || 'gemini-3.8-flash';
    const maxRetries = options.retryCount ?? 2;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      const startTime = Date.now();
      try {
        const config: Record<string, any> = {};
        if (options.responseFormatJson) {
          config.responseMimeType = 'application/json';
        }
        if (options.temperature !== undefined) {
          config.temperature = options.temperature;
        }
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options.maxTokens) {
          config.maxOutputTokens = options.maxTokens;
        }

        const response = await this.client.models.generateContent({
          model: modelName,
          contents: options.prompt,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        const durationMs = Date.now() - startTime;
        const text = response.text || '';

        // Extract real token usage from Gemini response
        const promptTokens = response.usageMetadata?.promptTokenCount || 0;
        const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
        const totalTokens = response.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

        const usage: TokenUsage = {
          promptTokens,
          completionTokens,
          totalTokens,
        };

        // Update telemetry
        this.totalTokens.promptTokens += promptTokens;
        this.totalTokens.completionTokens += completionTokens;
        this.totalTokens.totalTokens += totalTokens;
        this.totalRequests += 1;
        this.lastUsedTimestamp = Date.now();
        this.rateLimitState = { isLimited: false, updatedAt: Date.now() };

        let parsedJson: any = undefined;
        if (options.responseFormatJson) {
          try {
            // Strip markdown block fences if present
            const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsedJson = JSON.parse(cleaned);
          } catch (jsonErr: any) {
            console.warn(`[GeminiAdapter] JSON parse warning: ${jsonErr.message}`);
          }
        }

        return {
          text,
          parsedJson,
          model: modelName,
          provider: this.id,
          durationMs,
          usage,
          rawResponse: response,
        };
      } catch (err: any) {
        lastError = err;
        attempt++;

        const errMsg = String(err?.message || err);
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota') ||
          errMsg.includes('rate limit');

        if (isRateLimit) {
          this.rateLimitState = {
            isLimited: true,
            retryAfterSeconds: 30,
            lastError: errMsg,
            updatedAt: Date.now(),
          };
          console.warn(`[GeminiAdapter] Rate limit detected (attempt ${attempt}/${maxRetries}): ${errMsg}`);
        } else {
          console.warn(`[GeminiAdapter] Error on attempt ${attempt}/${maxRetries}: ${errMsg}`);
        }

        if (attempt <= maxRetries) {
          // Exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((res) => setTimeout(res, backoffMs));
        }
      }
    }

    throw lastError || new Error(`Gemini request failed after ${maxRetries} retries.`);
  }
}
