import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  OrchestrationPlan,
  OrchestrationProjectState,
  OrchestrationTask,
  ProjectSpecification,
  TaskCategory,
} from './types.js';
import { ProjectSpecificationGenerator } from './specGenerator.js';
import { TaskRouter } from './taskRouter.js';
import { DagScheduler } from './dagScheduler.js';
import { CodingAgentService } from '../services/codingAgent.js';
import { globalProviderRegistry } from '../providers/registry.js';
import { projectIntegrationEngine } from '../integration/integrationEngine.js';
import { SandboxManager } from '../sandbox/sandboxManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../.nexora-data/projects');

export class OrchestrationEngine {
  private static instance: OrchestrationEngine;
  private projects: Map<string, OrchestrationProjectState> = new Map();
  private activeWorkers: Map<string, Set<string>> = new Map(); // projectId -> Set of running taskIds
  private isProcessing = false;
  private queueInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.ensureDataDir();
    this.loadPersistedProjects();
    this.startQueueWorker();
  }

  public static getInstance(): OrchestrationEngine {
    if (!OrchestrationEngine.instance) {
      OrchestrationEngine.instance = new OrchestrationEngine();
    }
    return OrchestrationEngine.instance;
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[OrchestrationEngine] Could not create data dir:', err);
    }
  }

  private loadPersistedProjects() {
    try {
      if (fs.existsSync(DATA_DIR)) {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
            const state = JSON.parse(raw) as OrchestrationProjectState;
            // Reset any orphaned 'running' status to 'queued' on restart
            state.tasks.forEach((t) => {
              if (t.status === 'running') t.status = 'queued';
            });
            state.activeWorkers = 0;
            this.projects.set(state.id, state);
          }
        }
      }
    } catch (err) {
      console.warn('[OrchestrationEngine] Failed to load persisted projects:', err);
    }
  }

  private persistProject(state: OrchestrationProjectState) {
    try {
      this.ensureDataDir();
      const filePath = path.join(DATA_DIR, `${state.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[OrchestrationEngine] Failed to persist project ${state.id}:`, err);
    }
  }

  /**
   * Generates a structured Project Specification from user description
   */
  public async generateSpecification(
    description: string,
    options: {
      name?: string;
      type?: string;
      stack?: string;
      design?: string;
      preferredModel?: string;
    } = {}
  ): Promise<ProjectSpecification> {
    const res = await ProjectSpecificationGenerator.generateSpecification({
      description,
      name: options.name,
      type: options.type,
      stack: options.stack,
      design: options.design,
      preferredModel: options.preferredModel,
    });
    return res.specification;
  }

  /**
   * Decomposes a ProjectSpecification into a DAG plan with model assignments
   */
  public async createPlan(
    spec: ProjectSpecification,
    options: {
      concurrencyLimit?: number;
      preferredModel?: string;
      userId?: string;
    } = {}
  ): Promise<OrchestrationPlan> {
    const projectId = `proj-${Date.now()}`;
    const concurrency = options.concurrencyLimit || 2;
    const userId = options.userId || 'default-user';

    // Structured decomposition tasks tailored to the specification
    const rawTaskBlueprints: {
      id: string;
      title: string;
      category: TaskCategory;
      description: string;
      targetFiles: string[];
      dependencies: string[];
    }[] = [
      {
        id: 'task-1',
        title: 'Domain Architecture & TypeScript Contracts',
        category: 'architecture',
        description: `Define core entity models (${spec.dataModels.map((m) => m.name).join(', ')}) and API interfaces in types/index.ts based on the system specification.`,
        targetFiles: ['src/types/index.ts', 'src/types/models.ts'],
        dependencies: [],
      },
      {
        id: 'task-2',
        title: 'Design System & Tailwind Theme Tokens',
        category: 'ui-design',
        description: `Establish color palettes, dark mode tokens, typography, and reusable layout shells matching ${spec.techStack.styling}.`,
        targetFiles: ['src/styles/theme.ts', 'src/components/layout/Shell.tsx'],
        dependencies: [],
      },
      {
        id: 'task-3',
        title: 'State Store & Mock Data Repository',
        category: 'database',
        description: `Implement persistent client repository layer with seeded datasets and local storage synchronization for ${spec.domain} data.`,
        targetFiles: ['src/services/store.ts', 'src/data/seedData.ts'],
        dependencies: ['task-1'],
      },
      {
        id: 'task-4',
        title: 'Core Feature Components & Views',
        category: 'frontend',
        description: `Build reactive dashboard components, interactive cards, detail inspectors, and filters using ${spec.techStack.framework}.`,
        targetFiles: ['src/components/features/MainView.tsx', 'src/components/features/CardGrid.tsx'],
        dependencies: ['task-1', 'task-2', 'task-3'],
      },
      {
        id: 'task-5',
        title: 'API Client & Service Layer',
        category: 'backend',
        description: `Create typed API client executing client-side simulation for ${spec.apiContracts.map((a) => a.endpoint).join(', ')}.`,
        targetFiles: ['src/services/apiClient.ts'],
        dependencies: ['task-1', 'task-3'],
      },
      {
        id: 'task-6',
        title: 'Security Sanitization & Role Guardrails',
        category: 'security',
        description: `Apply input validation, XSS prevention, and access simulation adhering to: ${spec.securityRules.slice(0, 2).join('; ')}.`,
        targetFiles: ['src/utils/security.ts'],
        dependencies: ['task-1'],
      },
      {
        id: 'task-7',
        title: 'Verification Test Suite & Smoke Runner',
        category: 'testing',
        description: 'Implement automated unit tests verifying schema integrity, component rendering, and error recovery.',
        targetFiles: ['src/tests/smoke.test.ts'],
        dependencies: ['task-4', 'task-5'],
      },
    ];

    // Assign models via transparent TaskRouter evaluation
    const tasks: OrchestrationTask[] = rawTaskBlueprints.map((raw) => {
      const routing = TaskRouter.evaluateTaskRouting(
        raw.category,
        4500,
        options.preferredModel
      );

      const idempotencyKey = DagScheduler.generateIdempotencyKey(
        projectId,
        raw.id,
        raw.targetFiles,
        raw.dependencies
      );

      return {
        id: raw.id,
        projectId,
        title: raw.title,
        category: raw.category,
        description: raw.description,
        targetFiles: raw.targetFiles,
        dependencies: raw.dependencies,
        assignedModelId: routing.assignedModelId,
        assignedProvider: routing.assignedProvider,
        routingReason: routing.routingReason,
        fallbackModelId: routing.fallbackModelId,
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
        idempotencyKey,
        outputFiles: [],
        logs: [`[Router] ${routing.routingReason}`],
      };
    });

    // Validate acyclic DAG
    DagScheduler.validateAcyclic(tasks);

    return {
      id: `plan-${Date.now()}`,
      projectId,
      specification: spec,
      tasks,
      concurrencyLimit: concurrency,
      totalEstimatedTokens: tasks.length * 4500,
      createdAt: Date.now(),
    };
  }

  /**
   * Initializes and starts a project orchestration queue
   */
  public async startProject(
    plan: OrchestrationPlan
  ): Promise<OrchestrationProjectState> {
    const state: OrchestrationProjectState = {
      id: plan.projectId,
      name: plan.specification.name,
      description: plan.specification.summary,
      status: 'running',
      specification: plan.specification,
      tasks: plan.tasks,
      activeWorkers: 0,
      concurrencyLimit: plan.concurrencyLimit,
      files: {},
      totalTokens: 0,
      totalCost: 0,
      startTime: Date.now(),
      systemLogs: [
        `[${new Date().toLocaleTimeString()}] Nexora Orchestrator initialized project "${plan.specification.name}".`,
        `[${new Date().toLocaleTimeString()}] DAG validated with ${plan.tasks.length} tasks (Concurrency limit: ${plan.concurrencyLimit}).`,
      ],
    };

    this.projects.set(state.id, state);
    this.activeWorkers.set(state.id, new Set());
    this.persistProject(state);

    // Trigger queue loop immediately
    setImmediate(() => this.processProjectQueue(state.id));

    return state;
  }

  /**
   * Continuous background queue processor
   */
  private startQueueWorker() {
    if (this.queueInterval) clearInterval(this.queueInterval);
    this.queueInterval = setInterval(() => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        for (const [projectId, project] of this.projects.entries()) {
          if (project.status === 'running') {
            this.processProjectQueue(projectId);
          }
        }
      } catch (err) {
        console.error('[OrchestrationEngine] Queue tick error:', err);
      } finally {
        this.isProcessing = false;
      }
    }, 1500);
  }

  /**
   * Checks ready tasks in DAG and dispatches concurrent executions
   */
  public async processProjectQueue(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project || project.status !== 'running') return;

    let workers = this.activeWorkers.get(projectId);
    if (!workers) {
      workers = new Set();
      this.activeWorkers.set(projectId, workers);
    }

    const runningTasks = project.tasks.filter((t) => t.status === 'running');
    project.activeWorkers = runningTasks.length;

    // Check if tasks are finished and trigger sandboxed verification
    const allDone = project.tasks.every((t) => t.status === 'completed');
    if (allDone) {
      project.status = 'verifying';
      project.activeWorkers = 0;
      project.systemLogs.push(
        `[${new Date().toLocaleTimeString()}] 📦 All ${project.tasks.length} tasks synthesized. Initiating isolated sandboxed execution, dependency checks, and build verification...`
      );
      this.persistProject(project);

      // Launch sandboxed execution in background
      setImmediate(() => this.runSandboxVerification(project.id));
      return;
    }

    // Check if any unrecoverable failure blocked the queue
    const anyFailed = project.tasks.some(
      (t) => t.status === 'failed' && t.retryCount >= t.maxRetries
    );
    if (anyFailed && runningTasks.length === 0) {
      project.status = 'failed';
      project.systemLogs.push(
        `[${new Date().toLocaleTimeString()}] ⚠️ Queue paused due to task failure. Manual intervention or alternate model selection required.`
      );
      this.persistProject(project);
      return;
    }

    // Find ready tasks that can run concurrently without file conflicts
    const readyTasks = DagScheduler.getReadyTasks(
      project.tasks,
      runningTasks,
      project.concurrencyLimit
    );

    if (readyTasks.length === 0) {
      return;
    }

    // Launch each ready task in parallel
    for (const task of readyTasks) {
      task.status = 'running';
      task.startTime = Date.now();
      task.logs.push(
        `[Execution] Dispatched to ${task.assignedModelId} (Attempt ${task.retryCount + 1}/${task.maxRetries + 1}).`
      );
      workers.add(task.id);
      project.activeWorkers = workers.size;

      project.systemLogs.push(
        `[${new Date().toLocaleTimeString()}] 🚀 Worker launched: [${task.id}] ${task.title} → ${task.assignedModelId}`
      );

      // Async execution in background
      this.executeTask(project, task);
    }

    this.persistProject(project);
  }

  /**
   * Executes a single task with real AI agent, retry logic, and provider reassignment
   */
  private async executeTask(
    project: OrchestrationProjectState,
    task: OrchestrationTask
  ) {
    const workers = this.activeWorkers.get(project.id);

    try {
      // Build project context from specification & existing generated files
      const projectContext = {
        name: project.name,
        description: project.description,
        specification: project.specification,
        stack: project.specification?.techStack.framework || 'React',
      };

      // Call CodingAgentService
      const result = await CodingAgentService.executeTask({
        task: {
          id: task.id,
          title: task.title,
          category: task.category,
          description: task.description,
          assignedModel: task.assignedModelId,
          targetFiles: task.targetFiles,
          dependencies: task.dependencies,
        },
        projectContext,
        existingFiles: project.files,
        overrideModel: task.assignedModelId,
      });

      if (result.success && result.files && result.files.length > 0) {
        // Run structured Project Code Integration Engine
        const integration = await projectIntegrationEngine.integrateTaskOutput({
          projectId: project.id,
          taskId: task.id,
          taskTitle: task.title,
          modelId: task.assignedModelId,
          files: result.files,
          projectContext,
          specification: project.specification,
          autoRepair: true,
        });

        // Sync project state with virtual filesystem
        for (const [filePath, virtualFile] of Object.entries(integration.updatedFiles)) {
          project.files[filePath] = {
            path: virtualFile.path,
            content: virtualFile.content,
            language: virtualFile.language,
            lastModified: virtualFile.lastModified,
            version: virtualFile.version,
          };
        }

        project.integrationHealth = integration.report.healthScore;
        project.activeConflicts = integration.report.conflicts.length;
        project.brokenImports = integration.report.validation.brokenImports.length;
        project.latestIntegrationReport = integration.report;

        task.status = 'completed';
        task.completedTime = Date.now();
        task.durationMs = task.completedTime - (task.startTime || task.completedTime);
        task.outputFiles = result.files;
        task.tokenUsage = result.tokenUsage;
        task.logs.push(`✓ Completed in ${task.durationMs}ms. ${integration.report.summary}`);

        if (result.tokenUsage) {
          project.totalTokens += result.tokenUsage.totalTokens;
          project.totalCost += (result.tokenUsage.totalTokens / 1000) * 0.0008;
        }

        project.systemLogs.push(
          `[${new Date().toLocaleTimeString()}] ✓ Integrated [${task.id}] ${task.title} (Health: ${integration.report.healthScore}%, ${integration.report.appliedFiles.length} files saved).`
        );

        if (integration.report.conflicts.length > 0) {
          project.systemLogs.push(
            `[${new Date().toLocaleTimeString()}] ⚠️ Conflict detected on ${integration.report.conflicts.map((c) => c.path).join(', ')}: auto-repair scheduled.`
          );
        }

        if (integration.report.validation.brokenImports.length > 0) {
          project.systemLogs.push(
            `[${new Date().toLocaleTimeString()}] 🔍 Import validator flagged: ${integration.report.validation.brokenImports.map((b) => b.importedSymbol).join(', ')}: targeted repair active.`
          );
        }
      } else {
        // Recoverable failure handling
        const failureMsg = result.error || 'Execution returned empty output files.';
        const isRateLimit =
          result.errorType === 'rate_limited' ||
          failureMsg.includes('429') ||
          failureMsg.includes('quota');
        const isMissingCredentials =
          result.errorType === 'missing_credentials' ||
          failureMsg.includes('credentials') ||
          failureMsg.includes('key');

        task.logs.push(`✕ Execution attempt failed: ${failureMsg}`);

        // Reassign provider if credentials missing or rate-limited
        if (isRateLimit || isMissingCredentials) {
          const { newTask, reassigned } = TaskRouter.reassignTask(task, failureMsg);
          if (reassigned) {
            Object.assign(task, newTask);
            task.status = 'pending'; // retry with new model
            project.systemLogs.push(
              `[${new Date().toLocaleTimeString()}] ⟲ [${task.id}] Reassigned to ${task.assignedModelId} (${isRateLimit ? 'Rate Limited' : 'Missing Key'}).`
            );
            return;
          }
        }

        // Retry logic within limits
        if (task.retryCount < task.maxRetries) {
          task.retryCount += 1;
          task.status = 'pending';
          task.logs.push(`⟲ Scheduled retry (${task.retryCount}/${task.maxRetries})...`);
          project.systemLogs.push(
            `[${new Date().toLocaleTimeString()}] ⟲ Retrying [${task.id}] (Attempt ${task.retryCount + 1})...`
          );
        } else {
          task.status = 'failed';
          task.error = failureMsg;
          task.errorType = isRateLimit
            ? 'rate_limited'
            : isMissingCredentials
            ? 'missing_credentials'
            : 'execution_error';
          project.systemLogs.push(
            `[${new Date().toLocaleTimeString()}] ✕ [${task.id}] Failed after ${task.retryCount + 1} attempts: ${failureMsg}`
          );
        }
      }
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || 'Unexpected worker error';
      task.logs.push(`✕ Exception: ${task.error}`);
      project.systemLogs.push(
        `[${new Date().toLocaleTimeString()}] ✕ Error on [${task.id}]: ${task.error}`
      );
    } finally {
      if (workers) workers.delete(task.id);
      project.activeWorkers = workers ? workers.size : 0;
      this.persistProject(project);

      // Trigger next ready tasks
      setImmediate(() => this.processProjectQueue(project.id));
    }
  }

  public pauseProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    project.status = 'paused';
    project.systemLogs.push(`[${new Date().toLocaleTimeString()}] ⏸ Queue paused by user.`);
    this.persistProject(project);
    return true;
  }

  public resumeProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    project.status = 'running';
    project.systemLogs.push(`[${new Date().toLocaleTimeString()}] ▶ Queue resumed.`);
    this.persistProject(project);
    setImmediate(() => this.processProjectQueue(projectId));
    return true;
  }

  public retryTask(projectId: string, taskId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    task.status = 'pending';
    task.error = undefined;
    task.retryCount = 0;
    task.logs.push(`[User Action] Manual task retry requested.`);
    project.systemLogs.push(`[${new Date().toLocaleTimeString()}] ⟲ Manually queued [${taskId}] for retry.`);

    if (project.status === 'failed' || project.status === 'paused') {
      project.status = 'running';
    }

    this.persistProject(project);
    setImmediate(() => this.processProjectQueue(projectId));
    return true;
  }

  public reassignTask(
    projectId: string,
    taskId: string,
    targetModelId: string
  ): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const oldModel = task.assignedModelId;
    task.assignedModelId = targetModelId;
    task.reassignedFromModel = oldModel;
    task.status = 'pending';
    task.error = undefined;
    task.retryCount = 0;
    task.routingReason = `Manually reassigned to ${targetModelId} by user.`;
    task.logs.push(`[User Action] Reassigned executor from ${oldModel} to ${targetModelId}.`);

    project.systemLogs.push(
      `[${new Date().toLocaleTimeString()}] ⇄ Reassigned [${taskId}] to ${targetModelId}.`
    );

    if (project.status === 'failed' || project.status === 'paused') {
      project.status = 'running';
    }

    this.persistProject(project);
    setImmediate(() => this.processProjectQueue(projectId));
    return true;
  }

  public getProjectState(projectId: string): OrchestrationProjectState | undefined {
    return this.projects.get(projectId);
  }

  public listProjects(): OrchestrationProjectState[] {
    return Array.from(this.projects.values());
  }

  /**
   * Executes the isolated sandboxed execution, build check, and test verification suite
   */
  public async runSandboxVerification(projectId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;

    project.status = 'verifying';
    project.systemLogs.push(
      `[${new Date().toLocaleTimeString()}] 🛡️ Sandbox initialized at /tmp/nexora-sandboxes/${projectId}. Secrets isolated.`
    );
    this.persistProject(project);

    try {
      const result = await SandboxManager.executeProjectSandbox({
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description,
        maxRepairAttempts: project.maxRepairAttempts || 3,
        timeoutMs: 25000,
        runTests: true,
      });

      project.sandboxReport = result.report;

      // Sync any files repaired in the virtual filesystem back to the project state
      const vfs = projectIntegrationEngine.getVFS(projectId);
      if (vfs) {
        for (const [filePath, virtualFile] of Object.entries(vfs.getAllFiles())) {
          project.files[filePath] = {
            path: virtualFile.path,
            content: virtualFile.content,
            language: virtualFile.language,
            lastModified: virtualFile.lastModified,
            version: virtualFile.version,
          };
        }
      }

      if (result.success) {
        project.status = 'completed';
        project.completedTime = Date.now();
        project.activeWorkers = 0;
        project.systemLogs.push(
          `[${new Date().toLocaleTimeString()}] ✨ Sandbox Verification PASSED: ${result.report.summary}`
        );
      } else {
        project.status = 'failed';
        project.activeWorkers = 0;
        project.lastError = `Sandbox verification failed: ${result.report.summary}`;
        project.systemLogs.push(
          `[${new Date().toLocaleTimeString()}] ✕ Sandbox Verification FAILED: ${result.report.summary}`
        );
      }

      this.persistProject(project);
      return result.success;
    } catch (err: any) {
      project.status = 'failed';
      project.activeWorkers = 0;
      project.lastError = err?.message || 'Sandbox execution runtime error';
      project.systemLogs.push(
        `[${new Date().toLocaleTimeString()}] ✕ Sandbox execution fatal error: ${project.lastError}`
      );
      this.persistProject(project);
      return false;
    }
  }
}

export const orchestrationEngine = OrchestrationEngine.getInstance();
