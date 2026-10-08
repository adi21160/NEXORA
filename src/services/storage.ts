import { Project, AIModel, QuotaStats } from '../types';
import { INITIAL_AI_MODELS } from '../data/modelsRegistry';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

const STORAGE_KEYS = {
  PROJECTS: 'nexus_ai_projects_v2',
  ACTIVE_PROJECT_ID: 'nexus_ai_active_project_id',
  MODELS: 'nexus_ai_models_v2',
  QUOTAS: 'nexus_ai_quotas_v2',
  USER_SESSION: 'nexus_ai_user_session',
};

export const StorageService = {
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load projects from storage:', e);
    }
    // Default to sample projects
    return SAMPLE_PROJECTS;
  },

  saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects:', e);
    }
  },

  getActiveProjectId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID) || 'proj-cloudpulse-01';
  },

  setActiveProjectId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
  },

  getModels(): AIModel[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load models:', e);
    }
    return INITIAL_AI_MODELS;
  },

  saveModels(models: AIModel[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));
    } catch (e) {
      console.error('Failed to save models:', e);
    }
  },

  getQuotaStats(): QuotaStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUOTAS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load quotas:', e);
    }
    return {
      totalApiRequests: 4562,
      totalTokensConsumed: 8635000,
      totalEstimatedCost: 12.84,
      spendingLimit: 50.0,
      rateLimitIncidents: 4,
      activeFallbacks: 12,
      modelBreakdown: {
        'gemini-3.8-flash': { requests: 1420, tokens: 1845000, cost: 0.28 },
        'claude-3-7-sonnet': { requests: 890, tokens: 2430000, cost: 7.29 },
        'gpt-4o': { requests: 740, tokens: 1650000, cost: 4.12 },
        'deepseek-r1': { requests: 512, tokens: 980000, cost: 0.54 },
        'gemini-3-1-pro': { requests: 380, tokens: 820000, cost: 1.02 },
        'llama-3-3-70b': { requests: 610, tokens: 710000, cost: 0.14 },
      },
      categoryBreakdown: {
        frontend: 38,
        backend: 22,
        architecture: 15,
        testing: 12,
        security: 8,
        docs: 5,
      },
    };
  },

  saveQuotaStats(stats: QuotaStats): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTAS, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save quota stats:', e);
    }
  },
};
