import { AIProviderAdapter, ProviderId, ProviderStatus } from './types.js';
import { GeminiProviderAdapter } from './geminiAdapter.js';
import { OpenAIProviderAdapter } from './openaiAdapter.js';

export class ProviderRegistry {
  private adapters: Map<ProviderId, AIProviderAdapter> = new Map();

  constructor() {
    this.register(new GeminiProviderAdapter());
    this.register(new OpenAIProviderAdapter());
  }

  public register(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: ProviderId): AIProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): AIProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getStatuses(userId: string = 'default-user'): ProviderStatus[] {
    return this.getAllAdapters().map((a) => a.getStatus(userId));
  }

  /**
   * Determine which provider can handle the requested modelId
   */
  public resolveProviderForModel(modelId: string, userId: string = 'default-user'): AIProviderAdapter | undefined {
    // Exact model support check
    for (const adapter of this.adapters.values()) {
      if (adapter.supportsModel(modelId)) {
        return adapter;
      }
    }

    // Heuristic prefix match
    if (modelId.startsWith('gemini')) {
      return this.adapters.get('gemini');
    }
    if (modelId.startsWith('gpt') || modelId.startsWith('openai')) {
      return this.adapters.get('openai');
    }

    // Default to Gemini if configured, else first configured
    const gemini = this.adapters.get('gemini');
    if (gemini?.isConfigured(userId)) return gemini;

    const configured = this.getAllAdapters().find((a) => a.isConfigured(userId));
    return configured || gemini;
  }

  /**
   * Set API key for a specific provider securely
   */
  public setProviderKey(providerId: ProviderId, apiKey: string, userId: string = 'default-user'): void {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    adapter.setApiKey(apiKey, userId);
  }
}

// Global singleton instance for the server runtime
export const globalProviderRegistry = new ProviderRegistry();
