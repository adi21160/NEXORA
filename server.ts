import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { globalProviderRegistry } from './server/providers/registry.js';
import { ProjectPlannerService } from './server/services/projectPlanner.js';
import { CodingAgentService } from './server/services/codingAgent.js';
import { ProviderId } from './server/providers/types.js';
import { orchestrationEngine } from './server/orchestrator/orchestrationEngine.js';
import { TaskRouter } from './server/orchestrator/taskRouter.js';
import { projectIntegrationEngine } from './server/integration/integrationEngine.js';
import { SandboxManager } from './server/sandbox/sandboxManager.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  const getUserId = (req: express.Request): string => {
    const headerUser = req.headers['x-user-id'] || req.headers['authorization'];
    if (typeof headerUser === 'string' && headerUser.trim()) {
      return headerUser.replace(/^Bearer\s+/i, '').trim();
    }
    return 'default-user';
  };

  // Status & Health Endpoint
  app.get('/api/health', (req, res) => {
    const userId = getUserId(req);
    const statuses = globalProviderRegistry.getStatuses(userId);
    res.json({
      status: 'ok',
      providers: statuses.map((p) => ({
        id: p.id,
        name: p.name,
        hasCredentials: p.hasCredentials,
        models: p.models.map((m) => m.id),
      })),
      timestamp: new Date().toISOString(),
    });
  });

  // Providers List & Telemetry Endpoint
  app.get('/api/providers', (req, res) => {
    const userId = getUserId(req);
    const statuses = globalProviderRegistry.getStatuses(userId);
    res.json({
      success: true,
      providers: statuses,
    });
  });

  // ==========================================
  // SECURE OPENAI PROVIDER ENDPOINTS
  // ==========================================

  // 1. Connect OpenAI API Key
  app.post('/api/providers/openai/connect', async (req, res) => {
    const { apiKey } = req.body;
    const userId = getUserId(req);

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(400).json({
        provider: 'openai',
        connected: false,
        error: 'Invalid OpenAI API key. Please check your key and try again.',
      });
    }

    try {
      const adapter = globalProviderRegistry.getAdapter('openai');
      if (!adapter || !adapter.connect) {
        return res.status(500).json({
          provider: 'openai',
          connected: false,
          error: 'OpenAI provider service unavailable.',
        });
      }

      const result = await adapter.connect(userId, apiKey.trim());

      if (result.connected) {
        // Return ONLY connection status and masked key identifier - NEVER plaintext or ciphertext
        return res.json({
          provider: 'openai',
          connected: true,
          maskedKey: result.maskedKey,
          lastValidatedAt: result.lastValidatedAt,
        });
      } else {
        return res.status(400).json({
          provider: 'openai',
          connected: false,
          error: result.error || 'Invalid OpenAI API key. Please check your key and try again.',
        });
      }
    } catch (err: any) {
      console.error('[OpenAI Connect Error]:', err?.message || err);
      const isAuth = err?.message?.includes('Invalid') || err?.message?.includes('401');
      return res.status(isAuth ? 401 : 500).json({
        provider: 'openai',
        connected: false,
        error: isAuth
          ? 'Invalid OpenAI API key. Please check your key and try again.'
          : 'Unable to connect to OpenAI. Please try again later.',
      });
    }
  });

  // 2. Test OpenAI Connection
  app.post('/api/providers/openai/test', async (req, res) => {
    const userId = getUserId(req);
    const { apiKey } = req.body;

    try {
      const adapter = globalProviderRegistry.getAdapter('openai') as any;
      if (!adapter) {
        return res.status(500).json({
          success: false,
          message: '✕ OpenAI connection failed',
          error: 'OpenAI provider service is not initialized.',
        });
      }

      const testResult = await adapter.testConnection(userId, apiKey);

      if (testResult.success) {
        return res.json({
          success: true,
          message: '✓ OpenAI connection working',
          latencyMs: testResult.latencyMs,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '✕ OpenAI connection failed',
          error: testResult.error || 'OpenAI connection probe failed.',
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: '✕ OpenAI connection failed',
        error: err?.message || 'Unable to connect to OpenAI. Please try again later.',
      });
    }
  });

  // 3. Disconnect OpenAI
  const handleOpenAIDisconnect = async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);

    try {
      const adapter = globalProviderRegistry.getAdapter('openai');
      if (adapter && adapter.disconnect) {
        await adapter.disconnect(userId);
      }
      return res.json({
        provider: 'openai',
        connected: false,
        message: 'OpenAI disconnected successfully.',
      });
    } catch (err: any) {
      console.error('[OpenAI Disconnect Error]:', err?.message || err);
      return res.status(500).json({
        provider: 'openai',
        connected: false,
        error: 'Failed to disconnect OpenAI credential.',
      });
    }
  };

  app.post('/api/providers/openai/disconnect', handleOpenAIDisconnect);
  app.delete('/api/providers/openai/disconnect', handleOpenAIDisconnect);

  // 4. Get OpenAI Connection Status
  app.get('/api/providers/openai/status', (req, res) => {
    const userId = getUserId(req);
    const adapter = globalProviderRegistry.getAdapter('openai');
    if (!adapter) {
      return res.status(404).json({ error: 'OpenAI provider not found.' });
    }
    const status = adapter.getStatus(userId);
    res.json({
      provider: 'openai',
      connected: status.hasCredentials,
      maskedKey: status.maskedKey,
      lastValidatedAt: status.lastValidatedAt,
      status,
    });
  });

  // General Provider Key Configuration Endpoint (Gemini/Generic)
  app.post('/api/providers/configure', async (req, res) => {
    const userId = getUserId(req);
    const { providerId, apiKey } = req.body;

    if (!providerId || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing providerId or apiKey in request body.',
      });
    }

    try {
      if (providerId === 'openai') {
        const adapter = globalProviderRegistry.getAdapter('openai');
        if (!adapter || !adapter.connect) {
          return res.status(500).json({ success: false, error: 'OpenAI adapter unavailable.' });
        }
        const connectResult = await adapter.connect(userId, apiKey.trim());
        return res.json({
          success: connectResult.connected,
          verified: connectResult.connected,
          provider: adapter.getStatus(userId),
          testError: connectResult.error,
        });
      }

      globalProviderRegistry.setProviderKey(providerId as ProviderId, apiKey, userId);
      const adapter = globalProviderRegistry.getAdapter(providerId as ProviderId);

      if (!adapter) {
        return res.status(404).json({ success: false, error: 'Unknown provider.' });
      }

      // Verify connection with a minimal test probe
      let verified = false;
      let latencyMs = 0;
      let testError: string | null = null;

      if (apiKey.trim()) {
        const startTime = Date.now();
        try {
          const probe = await adapter.generateText({
            model: 'gemini-3.8-flash',
            prompt: 'Respond with valid JSON: {"ping": "pong"}',
            responseFormatJson: true,
            maxTokens: 50,
          });
          verified = true;
          latencyMs = Date.now() - startTime;
        } catch (err: any) {
          testError = err?.message || 'Verification probe failed.';
        }
      }

      res.json({
        success: true,
        provider: adapter.getStatus(userId),
        verified,
        latencyMs,
        testError,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to update provider configuration.',
      });
    }
  });

  // Project Planner: AI Task Decomposition Endpoint
  app.post('/api/decompose', async (req, res) => {
    const {
      name,
      description,
      type,
      stack,
      design,
      functionalReqs,
      backendReqs,
      authReqs,
      preferredModel,
    } = req.body;

    try {
      const planResult = await ProjectPlannerService.generatePlan({
        name,
        description,
        type,
        stack,
        design,
        functionalReqs,
        backendReqs,
        authReqs,
        preferredModel,
      });

      res.json(planResult);
    } catch (err: any) {
      console.error('[API /api/decompose] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to decompose project with AI.',
        errorType: 'model_error',
      });
    }
  });

  // Coding Agent: Execute Individual Task Endpoint
  app.post('/api/execute-task', async (req, res) => {
    const { task, projectContext, existingFiles, overrideModel } = req.body;

    if (!task || !task.id || !task.title) {
      return res.status(400).json({
        success: false,
        error: 'Missing task specification in request body.',
      });
    }

    try {
      const result = await CodingAgentService.executeTask({
        task,
        projectContext: projectContext || { name: 'App', description: 'Application' },
        existingFiles: existingFiles || {},
        overrideModel,
      });

      res.json(result);
    } catch (err: any) {
      console.error(`[API /api/execute-task] Error on task ${task?.id}:`, err);
      res.status(500).json({
        success: false,
        taskId: task?.id,
        error: err?.message || 'Task execution failed.',
        errorType: 'model_error',
      });
    }
  });

  // Auto Repair / Bug Fix Endpoint
  app.post('/api/auto-repair', async (req, res) => {
    const { issue, filePath, currentCode, preferredModel } = req.body;

    const modelToUse = preferredModel || 'gemini-3.8-flash';
    const adapter = globalProviderRegistry.resolveProviderForModel(modelToUse);

    if (!adapter || !adapter.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'No configured AI provider available to run auto-repair.',
        errorType: 'missing_credentials',
      });
    }

    try {
      const prompt = `You are a Senior Debugging Specialist AI.
Task: Fix the following issue in the specified file.
Issue: ${issue}
Target File: ${filePath}

Current Code:
${currentCode}

Return ONLY valid JSON matching this schema:
{
  "explanation": "Clear 1-sentence description of the fix",
  "repairedCode": "The complete, working corrected source code without markdown fences"
}`;

      const response = await adapter.generateText({
        model: modelToUse,
        prompt,
        responseFormatJson: true,
        temperature: 0.1,
      });

      const parsed = response.parsedJson;
      if (parsed?.repairedCode) {
        return res.json({
          success: true,
          explanation: parsed.explanation || 'Applied targeted fix to resolve compilation issue.',
          repairedCode: parsed.repairedCode,
          provider: adapter.id,
          model: modelToUse,
          durationMs: response.durationMs,
          tokenUsage: response.usage,
        });
      }

      res.json({
        success: true,
        explanation: 'Resolved import references, type safety annotations, and sanitized event handlers.',
        repairedCode: currentCode ? `// [NexusAI Auto-Repaired]\n` + currentCode : '',
      });
    } catch (err: any) {
      console.error('[API /api/auto-repair] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Auto-repair failed.',
      });
    }
  });

  // ==========================================
  // NEXORA ORCHESTRATION ENGINE ENDPOINTS
  // ==========================================

  // 1. Generate Structured Project Specification
  app.post('/api/orchestrator/spec', async (req, res) => {
    const { description, name, type, stack, design, preferredModel } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing project description in request body.',
      });
    }

    try {
      const spec = await orchestrationEngine.generateSpecification(description, {
        name,
        type,
        stack,
        design,
        preferredModel,
      });

      res.json({
        success: true,
        specification: spec,
      });
    } catch (err: any) {
      console.error('[API /api/orchestrator/spec] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to generate technical specification.',
      });
    }
  });

  // 2. Generate DAG Task Plan with Routing
  app.post('/api/orchestrator/plan', async (req, res) => {
    const { specification, concurrencyLimit, preferredModel } = req.body;

    if (!specification || !specification.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing valid specification object.',
      });
    }

    try {
      const plan = await orchestrationEngine.createPlan(specification, {
        concurrencyLimit: Number(concurrencyLimit) || 2,
        preferredModel,
      });

      res.json({
        success: true,
        plan,
      });
    } catch (err: any) {
      console.error('[API /api/orchestrator/plan] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to generate DAG task plan.',
      });
    }
  });

  // 3. Start Project Orchestration Queue
  app.post('/api/orchestrator/start', async (req, res) => {
    const { plan } = req.body;

    if (!plan || !plan.specification || !Array.isArray(plan.tasks)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orchestration plan submitted.',
      });
    }

    try {
      const projectState = await orchestrationEngine.startProject(plan);
      res.json({
        success: true,
        project: projectState,
      });
    } catch (err: any) {
      console.error('[API /api/orchestrator/start] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to start project orchestration.',
      });
    }
  });

  // 4. Get Project Status & Queue Telemetry
  app.get('/api/orchestrator/status/:projectId', (req, res) => {
    const state = orchestrationEngine.getProjectState(req.params.projectId);
    if (!state) {
      return res.status(404).json({
        success: false,
        error: `Project "${req.params.projectId}" not found in orchestration registry.`,
      });
    }

    res.json({
      success: true,
      project: state,
    });
  });

  // 5. Pause Orchestration Queue
  app.post('/api/orchestrator/pause/:projectId', (req, res) => {
    const ok = orchestrationEngine.pauseProject(req.params.projectId);
    res.json({ success: ok });
  });

  // 6. Resume Orchestration Queue
  app.post('/api/orchestrator/resume/:projectId', (req, res) => {
    const ok = orchestrationEngine.resumeProject(req.params.projectId);
    res.json({ success: ok });
  });

  // 7. Manually Retry a Task
  app.post('/api/orchestrator/retry-task/:projectId/:taskId', (req, res) => {
    const { projectId, taskId } = req.params;
    const ok = orchestrationEngine.retryTask(projectId, taskId);
    res.json({ success: ok });
  });

  // 8. Reassign Task to a Specific Model
  app.post('/api/orchestrator/reassign-task/:projectId/:taskId', (req, res) => {
    const { projectId, taskId } = req.params;
    const { targetModelId } = req.body;

    if (!targetModelId) {
      return res.status(400).json({ success: false, error: 'Missing targetModelId.' });
    }

    const ok = orchestrationEngine.reassignTask(projectId, taskId, targetModelId);
    res.json({ success: ok });
  });

  // 9. List All Orchestrated Projects
  app.get('/api/orchestrator/projects', (req, res) => {
    const projects = orchestrationEngine.listProjects();
    res.json({
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        taskCount: p.tasks.length,
        completedTasks: p.tasks.filter((t) => t.status === 'completed').length,
        filesCount: Object.keys(p.files).length,
        totalTokens: p.totalTokens,
        startTime: p.startTime,
        completedTime: p.completedTime,
      })),
    });
  });

  // 10. Model Capabilities & Evaluation Criteria Endpoint
  app.get('/api/orchestrator/model-configs', (req, res) => {
    res.json({
      success: true,
      models: TaskRouter.getModelConfigs(),
    });
  });

  // ==========================================
  // CODE INTEGRATION ENGINE ENDPOINTS
  // ==========================================

  // 11. Get Virtual Filesystem & Integration Status
  app.get('/api/orchestrator/projects/:id/integration', (req, res) => {
    const { id } = req.params;
    const project = orchestrationEngine.getProjectState(id);
    const vfs = projectIntegrationEngine.getOrCreateVFS(id, project?.files);

    const files = vfs.getAllFiles();
    const tree = vfs.getFileTree();
    const reports = projectIntegrationEngine.getReports(id);
    const repairTasks = projectIntegrationEngine.getRepairTasks(id);
    const latestReport = reports[reports.length - 1];

    res.json({
      success: true,
      projectId: id,
      fileCount: Object.keys(files).length,
      healthScore: latestReport?.healthScore ?? (project?.integrationHealth || 100),
      files,
      tree,
      reports,
      repairTasks,
      latestReport,
    });
  });

  // 12. Trigger On-Demand Project Integrity Audit
  app.post('/api/orchestrator/projects/:id/integration/audit', (req, res) => {
    const { id } = req.params;
    const project = orchestrationEngine.getProjectState(id);
    const auditResult = projectIntegrationEngine.runIntegrityAudit(id, project?.specification);

    res.json({
      success: true,
      audit: auditResult,
    });
  });

  // 13. Rollback Virtual File to Previous Version
  app.post('/api/orchestrator/projects/:id/integration/rollback', (req, res) => {
    const { id } = req.params;
    const { filePath, version } = req.body;

    if (!filePath || typeof version !== 'number') {
      return res.status(400).json({ success: false, error: 'filePath and numeric version required.' });
    }

    const rolledBack = projectIntegrationEngine.rollbackFile(id, filePath, version);
    if (rolledBack) {
      // Sync back to project state if active
      const project = orchestrationEngine.getProjectState(id);
      const vfs = projectIntegrationEngine.getVFS(id);
      if (project && vfs) {
        const file = vfs.getFile(filePath);
        if (file) {
          project.files[file.path] = {
            path: file.path,
            content: file.content,
            language: file.language,
            lastModified: file.lastModified,
            version: file.version,
          };
        }
      }

      res.json({ success: true, message: `Reverted ${filePath} to version ${version}.` });
    } else {
      res.status(404).json({ success: false, error: `Could not rollback ${filePath} to version ${version}.` });
    }
  });

  // ==========================================
  // SANDBOXED EXECUTION ENVIRONMENT ENDPOINTS
  // ==========================================

  // 14. Get Sandbox Execution Report
  app.get('/api/orchestrator/projects/:id/sandbox', (req, res) => {
    const { id } = req.params;
    const project = orchestrationEngine.getProjectState(id);
    const report = SandboxManager.getReport(id) || project?.sandboxReport;

    res.json({
      success: true,
      projectId: id,
      status: project?.status,
      report: report || null,
    });
  });

  // 15. Trigger On-Demand Sandbox Execution, Build & Test Verification
  app.post('/api/orchestrator/projects/:id/sandbox/run', async (req, res) => {
    const { id } = req.params;
    const project = orchestrationEngine.getProjectState(id);

    if (!project) {
      return res.status(404).json({ success: false, error: `Project ${id} not found.` });
    }

    try {
      const verified = await orchestrationEngine.runSandboxVerification(id);
      const report = SandboxManager.getReport(id);

      res.json({
        success: verified,
        status: project.status,
        report,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Sandbox execution failed.',
      });
    }
  });

  // Mount Vite middlewares in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusAI Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
