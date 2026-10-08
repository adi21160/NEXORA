import { globalProviderRegistry } from '../providers/registry.js';
import { GenerateTextResult } from '../providers/types.js';

export interface CodingTaskInput {
  task: {
    id: string;
    title: string;
    category: string;
    description: string;
    targetFiles: string[];
    assignedModel?: string;
    dependencies?: string[];
  };
  projectContext: {
    name: string;
    description: string;
    stack?: string;
    design?: string;
  };
  existingFiles?: Record<string, { content: string; language?: string }>;
  overrideModel?: string;
  userId?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface CodingAgentResult {
  success: boolean;
  taskId: string;
  executedModel: string;
  provider: string;
  durationMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  logs: string;
  files: GeneratedFile[];
  error?: string;
  errorType?: 'missing_credentials' | 'rate_limited' | 'model_error';
  setupInstructions?: string;
}

export class CodingAgentService {
  public static async executeTask(input: CodingTaskInput): Promise<CodingAgentResult> {
    const { task, projectContext, existingFiles, userId = 'default-user' } = input;
    const requestedModel = input.overrideModel || task.assignedModel || 'gemini-3.8-flash';

    let adapter = globalProviderRegistry.resolveProviderForModel(requestedModel, userId);

    // If requested provider is not configured, check if Gemini fallback is available
    let fallbackEngaged = false;
    if (!adapter || !adapter.isConfigured(userId)) {
      const gemini = globalProviderRegistry.getAdapter('gemini');
      const openai = globalProviderRegistry.getAdapter('openai');

      if (gemini?.isConfigured(userId)) {
        adapter = gemini;
        fallbackEngaged = true;
      } else if (openai?.isConfigured(userId)) {
        adapter = openai;
        fallbackEngaged = true;
      } else {
        // Neither provider is configured! Do NOT simulate. Return explicit error message.
        return {
          success: false,
          taskId: task.id,
          executedModel: requestedModel,
          provider: adapter?.id || 'none',
          durationMs: 0,
          logs: `Provider credentials missing for ${requestedModel}.`,
          files: [],
          error: `No configured AI provider available to execute task "${task.title}".`,
          errorType: 'missing_credentials',
          setupInstructions:
            'Please configure GEMINI_API_KEY or OPENAI_API_KEY in the AI Models registry or environment.',
        };
      }
    }

    const effectiveModel = fallbackEngaged
      ? adapter.id === 'gemini'
        ? 'gemini-3.8-flash'
        : 'gpt-4o'
      : requestedModel;

    // Task-specific prompt construction tailored to the engineering domain
    const categoryInstructions = CodingAgentService.getCategorySpecificPrompt(task.category);

    const existingFileSummaries = Object.keys(existingFiles || {})
      .slice(0, 12)
      .map((path) => `- ${path}`)
      .join('\n');

    const prompt = `You are an elite Staff Software Engineer executing an assigned development task.

TASK SPECIFICATION:
- Task ID: ${task.id}
- Task Title: ${task.title}
- Category: ${task.category}
- Task Goal: ${task.description}
- Target Files to Generate or Update: ${task.targetFiles.join(', ')}

PROJECT OVERVIEW:
- Name: ${projectContext.name}
- Concept: ${projectContext.description}
- Stack: ${projectContext.stack || 'React 19, Tailwind CSS, TypeScript, Lucide Icons'}
- Design: ${projectContext.design || 'Modern Dark SaaS'}

EXISTING REPOSITORY FILES:
${existingFileSummaries || '(No files yet, this is the foundational task)'}

CATEGORY-SPECIFIC DIRECTIVES:
${categoryInstructions}

CODE GENERATION RULES:
1. Write 100% complete, working, production-grade code. Never use placeholders like "// TODO" or "// implement later".
2. For React components: Use modern TypeScript functional components with hooks, Lucide icons, and Tailwind CSS classes.
3. If creating 'src/App.tsx', ensure it includes "export default function App()" and renders a rich, interactive, fully functioning experience.
4. Output MUST be valid JSON adhering strictly to the schema below.

RETURN FORMAT (JSON ONLY, NO MARKDOWN OUTSIDE JSON):
{
  "logs": "Summary of what you implemented and verified",
  "files": [
    {
      "path": "exact target file path, e.g. src/App.tsx",
      "content": "Complete file content as a string"
    }
  ]
}`;

    const systemInstruction = `You are a Senior Coding Specialist operating within NexusAI Studio.
Generate robust, production-quality code.
Return ONLY valid JSON matching the schema: {"logs": string, "files": [{"path": string, "content": string}]}.`;

    try {
      const response: GenerateTextResult = await adapter.generateText({
        model: effectiveModel,
        systemInstruction,
        prompt,
        responseFormatJson: true,
        temperature: 0.2,
        userId,
      });

      const parsed = response.parsedJson;
      const rawFiles: any[] = Array.isArray(parsed?.files) ? parsed.files : [];

      const sanitizedFiles: GeneratedFile[] = rawFiles
        .filter((f) => f && typeof f.path === 'string' && typeof f.content === 'string')
        .map((f) => ({
          path: f.path.trim(),
          content: f.content,
        }));

      const logMsg =
        parsed?.logs ||
        (fallbackEngaged
          ? `Executed via ${adapter.name} (${effectiveModel}) as automatic fallback. Generated ${sanitizedFiles.length} file(s).`
          : `Generated ${sanitizedFiles.length} file(s) successfully using ${adapter.name} (${effectiveModel}).`);

      return {
        success: true,
        taskId: task.id,
        executedModel: effectiveModel,
        provider: adapter.id,
        durationMs: response.durationMs,
        tokenUsage: response.usage,
        logs: logMsg,
        files: sanitizedFiles,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Code generation failed.';
      const isRateLimit = errMsg.includes('429') || errMsg.includes('quota');

      return {
        success: false,
        taskId: task.id,
        executedModel: effectiveModel,
        provider: adapter.id,
        durationMs: 0,
        logs: `Task execution failed: ${errMsg}`,
        files: [],
        error: errMsg,
        errorType: isRateLimit ? 'rate_limited' : 'model_error',
        setupInstructions: isRateLimit
          ? 'Rate limit encountered. The task will be queued or reassigned to a fallback model.'
          : undefined,
      };
    }
  }

  private static getCategorySpecificPrompt(category: string): string {
    switch (category) {
      case 'architecture':
        return `- Define clean TypeScript interfaces, domain models, and system types in target file(s) (e.g. src/types/index.ts).
- Document system boundaries, states, and data contracts.`;

      case 'ui-design':
        return `- Define responsive layout tokens, color gradients, and Tailwind utilities.
- Ensure dark-mode first design tokens with subtle borders and elegant typography.`;

      case 'frontend':
        return `- Implement interactive React 19 components with real state management (useState, useEffect, useMemo).
- Use Lucide icons (import { IconName } from 'lucide-react') for visual fidelity.
- Include interactive controls: search inputs, filter buttons, tabs, modal dialogs, and real-time simulators.`;

      case 'backend':
        return `- Implement mock API service layer, state persistence hooks, and simulated WebSocket event emitters.
- Ensure realistic sample fixtures and seed data.`;

      case 'testing':
        return `- Implement automated assertion checks, unit test cases, and edge-case verifications for components and stores.`;

      case 'security':
        return `- Audit code for input sanitization, safe DOM sinks (no unsanitized innerHTML or eval), and CSP compliance.`;

      case 'docs':
        return `- Generate comprehensive README.md with architecture details, model attributions, and local setup steps.`;

      default:
        return `- Implement complete, well-typed TypeScript code matching project requirements.`;
    }
  }
}
