import { globalProviderRegistry } from '../providers/registry.js';
import { ProjectSpecification } from './types.js';

export interface SpecGenerationInput {
  name?: string;
  description: string;
  type?: string;
  stack?: string;
  design?: string;
  functionalReqs?: string;
  backendReqs?: string;
  authReqs?: string;
  preferredModel?: string;
}

export class ProjectSpecificationGenerator {
  public static async generateSpecification(
    input: SpecGenerationInput
  ): Promise<{
    specification: ProjectSpecification;
    executedModel: string;
    provider: string;
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    durationMs: number;
  }> {
    const modelToUse = input.preferredModel || 'gemini-3.8-flash';
    const adapter = globalProviderRegistry.resolveProviderForModel(modelToUse);

    if (!adapter) {
      throw new Error(`No provider adapter found for requested model "${modelToUse}".`);
    }

    if (!adapter.isConfigured()) {
      throw new Error(
        `${adapter.name} credentials are not configured. Please supply ${adapter.configuredEnvVar} to generate specifications.`
      );
    }

    const systemInstruction = `You are Nexora's Principal Technical Specification Architect.
Your role is to transform high-level user software ideas into a rigorous, production-grade technical specification.
You must return strictly valid JSON conforming to the requested schema.`;

    const prompt = `Generate a comprehensive technical specification for the following project request:

Project Name: ${input.name || 'Untitled Application'}
Project Type: ${input.type || 'Web Application'}
Description: ${input.description}
Preferred Tech Stack: ${input.stack || 'React 19, TypeScript, Tailwind CSS v4, Lucide Icons'}
Design Guidelines: ${input.design || 'Modern dark developer aesthetic with emerald/cyan accents'}
Functional Requirements: ${input.functionalReqs || 'Interactive flows, state persistence, clean UI'}
Backend Requirements: ${input.backendReqs || 'Mock persistence layer with realistic data contracts'}
Auth Requirements: ${input.authReqs || 'Role-based access simulation'}

Return ONLY a single valid JSON object strictly matching this schema:
{
  "name": "Concise Project Name",
  "summary": "Clear 2-sentence executive summary of architecture and purpose",
  "domain": "e-commerce | devtools | saas | dashboard | social | productivity",
  "architecturePattern": "Component-driven Single Page Application with modular services and state store",
  "techStack": {
    "framework": "React 19",
    "styling": "Tailwind CSS v4",
    "language": "TypeScript",
    "icons": "Lucide React",
    "stateManagement": "React State Hooks & LocalStorage Persistence"
  },
  "dataModels": [
    {
      "name": "ModelName",
      "fields": ["id: string", "title: string", "status: 'active' | 'archived'", "createdAt: number"],
      "description": "Entity purpose"
    }
  ],
  "apiContracts": [
    {
      "endpoint": "/api/items",
      "method": "GET",
      "description": "Retrieves filtered list of items"
    }
  ],
  "securityRules": [
    "Client input sanitization",
    "Local token verification"
  ],
  "uiGuidelines": [
    "Dark charcoal background #0a0f14 with emerald-500 glows",
    "Responsive grid with collapsible sidebars"
  ],
  "milestones": [
    "Core data models & TypeScript contracts",
    "UI design system & components",
    "Interactive state engine & persistence",
    "Verification tests & build validation"
  ]
}`;

    const startTime = Date.now();
    const result = await adapter.generateText({
      model: modelToUse,
      systemInstruction,
      prompt,
      responseFormatJson: true,
      temperature: 0.2,
    });

    const parsed = result.parsedJson as ProjectSpecification;
    if (!parsed || !parsed.name || !Array.isArray(parsed.dataModels)) {
      throw new Error('AI output could not be parsed into a valid ProjectSpecification structure.');
    }

    return {
      specification: {
        name: parsed.name || input.name || 'Nexora Project',
        summary: parsed.summary || input.description,
        domain: parsed.domain || 'saas',
        architecturePattern:
          parsed.architecturePattern || 'Modular React Component Architecture',
        techStack: parsed.techStack || {
          framework: 'React 19',
          styling: 'Tailwind CSS v4',
          language: 'TypeScript',
          icons: 'Lucide React',
          stateManagement: 'React Hooks & Local Storage',
        },
        dataModels: Array.isArray(parsed.dataModels) ? parsed.dataModels : [],
        apiContracts: Array.isArray(parsed.apiContracts) ? parsed.apiContracts : [],
        securityRules: Array.isArray(parsed.securityRules) ? parsed.securityRules : [],
        uiGuidelines: Array.isArray(parsed.uiGuidelines) ? parsed.uiGuidelines : [],
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      },
      executedModel: result.model,
      provider: result.provider,
      tokenUsage: result.usage,
      durationMs: Date.now() - startTime,
    };
  }
}
