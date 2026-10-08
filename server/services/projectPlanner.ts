import { globalProviderRegistry } from '../providers/registry.js';
import { GenerateTextResult } from '../providers/types.js';

export interface ProjectPlannerInput {
  name: string;
  description: string;
  type: string;
  stack?: string;
  design?: string;
  functionalReqs?: string;
  backendReqs?: string;
  authReqs?: string;
  preferredModel?: string; // e.g. 'gemini-3.8-flash' or 'gpt-4o'
  userId?: string;
}

export interface PlannedTask {
  id: string;
  title: string;
  category: 'architecture' | 'ui-design' | 'frontend' | 'backend' | 'database' | 'testing' | 'security' | 'docs';
  description: string;
  assignedModel: string;
  fallbackModel: string;
  dependencies: string[];
  targetFiles: string[];
  estimatedDurationSeconds: number;
}

export interface ProjectPlannerResult {
  success: boolean;
  summary: string;
  tasks: PlannedTask[];
  estimatedTokens: number;
  executedModel: string;
  provider: string;
  durationMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  errorType?: 'missing_credentials' | 'rate_limited' | 'model_error';
  setupInstructions?: string;
}

export class ProjectPlannerService {
  public static async generatePlan(input: ProjectPlannerInput): Promise<ProjectPlannerResult> {
    const userId = input.userId || 'default-user';
    const requestedModel = input.preferredModel || 'gemini-3.8-flash';
    const adapter = globalProviderRegistry.resolveProviderForModel(requestedModel, userId);

    if (!adapter) {
      return {
        success: false,
        summary: '',
        tasks: [],
        estimatedTokens: 0,
        executedModel: requestedModel,
        provider: 'none',
        durationMs: 0,
        error: `No provider adapter found for requested model "${requestedModel}".`,
        errorType: 'model_error',
        setupInstructions: 'Supported models: gemini-3.8-flash, gemini-3.1-pro, gpt-4o, gpt-4o-mini.',
      };
    }

    if (!adapter.isConfigured(userId)) {
      return {
        success: false,
        summary: '',
        tasks: [],
        estimatedTokens: 0,
        executedModel: requestedModel,
        provider: adapter.id,
        durationMs: 0,
        error: `${adapter.name} API credentials are not configured.`,
        errorType: 'missing_credentials',
        setupInstructions: `Please configure ${adapter.configuredEnvVar} in your environment or via the AI Models settings panel.`,
      };
    }

    // Task-specific prompt construction for project architecture & decomposition
    const systemInstruction = `You are a Principal Software Architect AI specializing in multi-model software synthesis.
Your objective is to decompose an application concept into an optimal 7 to 10 step execution plan.
Each task must be assigned to the most appropriate AI model based on specialty:
- "gemini-3.8-flash" (High-speed UI logic, state orchestration, rapid scaffolding)
- "gpt-4o" (System architecture, complex data models, API contract definitions)
- "claude-3-7-sonnet" (UI/UX design systems, modern Tailwind styling)
- "deepseek-r1" (Database schemas, algorithmic business logic)
- "gemini-3-1-pro" (OWASP security audits, vulnerability hardening)
- "llama-3-3-70b" (Unit test suites, accessibility checks, markdown docs)

You MUST respond strictly with valid JSON conforming to the requested schema.`;

    const prompt = `Decompose the following software project request into an executable task plan:

Project Details:
- Name: ${input.name || 'Web Project'}
- Project Type: ${input.type || 'Web Application'}
- Description: ${input.description || 'Interactive web application'}
- Technology Stack: ${input.stack || 'React, Tailwind CSS, TypeScript'}
- Design Aesthetic: ${input.design || 'Modern Dark SaaS with slate/cyan accents'}
- Functional Requirements: ${input.functionalReqs || 'Interactive components, state management, responsive UI'}
- Backend Layer: ${input.backendReqs || 'Persistent client store, mock service endpoints'}
- Auth Specification: ${input.authReqs || 'Role-based access control simulator'}

Return a single JSON object with this exact structure:
{
  "summary": "Clear 2-sentence summary of the architecture and multi-model distribution strategy.",
  "estimatedTokens": 14500,
  "tasks": [
    {
      "id": "task-1",
      "title": "Clear task name",
      "category": "architecture",
      "description": "Concrete explanation of what will be produced",
      "assignedModel": "gemini-3.8-flash",
      "fallbackModel": "gemini-3.8-flash",
      "dependencies": [],
      "targetFiles": ["src/types/index.ts", "README.md"],
      "estimatedDurationSeconds": 4
    }
  ]
}

Ensure dependencies form a valid DAG without circular cycles. Initial tasks (architecture, design tokens) must have empty dependencies [].`;

    try {
      const response: GenerateTextResult = await adapter.generateText({
        model: requestedModel,
        systemInstruction,
        prompt,
        responseFormatJson: true,
        temperature: 0.3,
        userId,
      });

      const parsed = response.parsedJson;
      const rawTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];

      const sanitizedTasks: PlannedTask[] = rawTasks.map((t: any, idx: number) => ({
        id: t.id || `task-${idx + 1}`,
        title: t.title || `Synthesis Step ${idx + 1}`,
        category: t.category || 'frontend',
        description: t.description || 'Implement application module component',
        assignedModel: t.assignedModel || requestedModel,
        fallbackModel: t.fallbackModel || 'gemini-3.8-flash',
        dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        targetFiles: Array.isArray(t.targetFiles) ? t.targetFiles : ['src/App.tsx'],
        estimatedDurationSeconds: Number(t.estimatedDurationSeconds) || 4,
      }));

      return {
        success: true,
        summary:
          parsed?.summary ||
          `Multi-model architecture plan synthesized with ${sanitizedTasks.length} DAG nodes via ${adapter.name}.`,
        tasks: sanitizedTasks,
        estimatedTokens: Number(parsed?.estimatedTokens) || 12000,
        executedModel: requestedModel,
        provider: adapter.id,
        durationMs: response.durationMs,
        tokenUsage: response.usage,
      };
    } catch (err: any) {
      console.error('[ProjectPlannerService] Generation error:', err);
      const errMsg = err?.message || 'Plan generation failed.';
      const isRateLimit = errMsg.includes('429') || errMsg.includes('quota');

      return {
        success: false,
        summary: '',
        tasks: [],
        estimatedTokens: 0,
        executedModel: requestedModel,
        provider: adapter.id,
        durationMs: 0,
        error: errMsg,
        errorType: isRateLimit ? 'rate_limited' : 'model_error',
        setupInstructions: isRateLimit
          ? 'Rate limit encountered. Try again in a few moments or choose a different model.'
          : undefined,
      };
    }
  }
}
