import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Download, CheckCircle2, 
  AlertTriangle, Clock, Terminal, Code2, Eye, FileText, 
  Layers, ShieldAlert, Sparkles, Send, Laptop, Tablet, 
  Smartphone, RefreshCw, Copy, Check, ChevronRight, 
  ChevronDown, ExternalLink, GitBranch, ArrowRight, Wrench,
  Network, Cpu, ShieldCheck, Zap
} from 'lucide-react';
import { 
  Project, ProjectTask, ProjectFile, AIModel, 
  TestCheckItem, ModelActivity, TaskStatus 
} from '../../types';
import { CodeIntegrator } from '../../services/codeIntegrator';
import { TestRunner } from '../../services/testRunner';
import { ExportService } from '../../services/exportService';
import { NexoraLogo } from '../brand/NexoraLogo';
import { IntegrationInspectorView } from '../integration/IntegrationInspectorView';
import { SandboxExecutionView } from '../sandbox/SandboxExecutionView';

interface WorkspaceViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  models: AIModel[];
  onOpenNewProject: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  project,
  onUpdateProject,
  models,
  onOpenNewProject,
}) => {
  // Center panel tabs
  const [centerTab, setCenterTab] = useState<'preview' | 'code' | 'files' | 'logs' | 'tests' | 'integration' | 'sandbox'>('preview');
  
  // Left panel view: 'list' or 'dag'
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'dag'>('list');

  // Preview device selector
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  // Active file in editor
  const [activeFilePath, setActiveFilePath] = useState<string>(
    project.activeFile || Object.keys(project.files)[0] || 'src/App.tsx'
  );
  const [editedCode, setEditedCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Natural language refinement prompt
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Active backend orchestrator status & sync
  const [activeWorkersCount, setActiveWorkersCount] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    project.tasks[0]?.id || null
  );
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);

  // AI Activity Stream logs
  const [activities, setActivities] = useState<ModelActivity[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Nexora Multi-Mind Orchestration Engine initialized.`,
    `[${new Date().toLocaleTimeString()}] Project workspace loaded: ${project.name}`,
    `[${new Date().toLocaleTimeString()}] DAG Dependency Queue: ${project.tasks.length} tasks scheduled with ${project.concurrencyLimit || 2} concurrent workers.`,
  ]);

  // Self-healing / Auto-repair state
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairExplanation, setRepairExplanation] = useState<string | null>(null);

  // Missing credentials or task error alert
  const [workspaceAlert, setWorkspaceAlert] = useState<{
    title: string;
    message: string;
    setupInstructions?: string;
  } | null>(null);

  // Generation loop state
  const [isPaused, setIsPaused] = useState(false);

  // Sync active file code
  useEffect(() => {
    if (project.files[activeFilePath]) {
      setEditedCode(project.files[activeFilePath].content);
    }
  }, [activeFilePath, project.files]);

  // Compile sandbox preview HTML
  const integrationReport = CodeIntegrator.integrateFiles(project.files, project.tasks);

  // ==========================================
  // REAL BACKEND ORCHESTRATION ENGINE CONNECTOR
  // ==========================================
  useEffect(() => {
    if (project.status !== 'generating' && project.status !== 'running') return;
    if (isPaused) return;

    let isMounted = true;

    const pollBackendQueue = async () => {
      try {
        const response = await fetch(`/api/orchestrator/status/${project.id}`);

        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.success && data.project) {
            const bProject = data.project;
            setActiveWorkersCount(bProject.activeWorkers || 0);

            // Sync tasks
            const mappedTasks: ProjectTask[] = bProject.tasks.map((bt: any) => ({
              id: bt.id,
              title: bt.title,
              category: bt.category,
              description: bt.description,
              assignedModel: bt.assignedModelId as any,
              fallbackModel: bt.fallbackModelId as any,
              status: bt.status,
              dependencies: bt.dependencies || [],
              targetFiles: bt.targetFiles || [],
              progress: bt.status === 'completed' ? 100 : bt.status === 'running' ? 50 : 0,
              retryCount: bt.retryCount || 0,
              maxRetries: bt.maxRetries || 2,
              logs: bt.logs || [],
              errorMsg: bt.error,
              startTime: bt.startTime,
              completedTime: bt.completedTime,
              tokenUsage: bt.tokenUsage,
              executedByModel: bt.assignedModelId,
              routingReason: bt.routingReason,
              idempotencyKey: bt.idempotencyKey,
            }));

            // Sync files
            const newFiles: Record<string, ProjectFile> = { ...project.files };
            let hasNewFiles = false;

            if (bProject.files) {
              for (const [p, f] of Object.entries(bProject.files as Record<string, any>)) {
                if (!newFiles[p] || newFiles[p].version !== f.version) {
                  hasNewFiles = true;
                  newFiles[p] = {
                    path: f.path,
                    content: f.content,
                    language: f.language || 'typescript',
                    lastModified: f.lastModified || Date.now(),
                    createdByTask: 'orchestrator',
                    version: f.version || 1,
                  };
                }
              }
            }

            // Sync system logs to terminal
            if (bProject.systemLogs && bProject.systemLogs.length > 0) {
              setTerminalLogs((prev) => {
                const updated = [...prev];
                for (const log of bProject.systemLogs) {
                  if (!updated.includes(log)) {
                    updated.push(log);
                  }
                }
                return updated.slice(-100);
              });
            }

            // Check if any unrecoverable failure occurred
            const failedTask = mappedTasks.find((t) => t.status === 'failed' && t.retryCount >= t.maxRetries);
            if (failedTask) {
              setWorkspaceAlert({
                title: 'Task Execution Paused',
                message: `Task [${failedTask.id}] failed: ${failedTask.errorMsg || 'Provider rate limit or error.'}`,
                setupInstructions: 'Use the Reassign button to switch models or click Retry Task.',
              });
            } else {
              setWorkspaceAlert(null);
            }

            // Check completion
            const allTasksCompleted = mappedTasks.length > 0 && mappedTasks.every((t) => t.status === 'completed');

            onUpdateProject({
              ...project,
              tasks: mappedTasks,
              files: hasNewFiles ? newFiles : project.files,
              status: allTasksCompleted ? 'completed' : bProject.status === 'failed' ? 'failed' : 'generating',
              updatedAt: Date.now(),
              stats: {
                ...project.stats,
                totalTokens: bProject.totalTokens || project.stats.totalTokens,
                estimatedCost: bProject.totalCost || project.stats.estimatedCost,
                modelsUsed: Array.from(new Set(mappedTasks.map((t) => t.assignedModel))),
              },
            });

            if (allTasksCompleted && project.status === 'generating') {
              const testResults = TestRunner.runTestSuite(hasNewFiles ? newFiles : project.files);
              onUpdateProject({
                ...project,
                status: 'completed',
                testResults,
                updatedAt: Date.now(),
              });
              setTerminalLogs((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] ✨ Nexora Orchestrator completed all tasks. 100% verified.`,
              ]);
            }
            return;
          }
        }

        // If project not in backend orchestrator, auto-register once
        if (response.status === 404 && isMounted) {
          const planPayload = {
            id: `plan-${Date.now()}`,
            projectId: project.id,
            specification: project.specification || {
              name: project.name,
              summary: project.description,
              domain: project.type.toLowerCase(),
              architecturePattern: 'Modular React Component Architecture',
              techStack: {
                framework: 'React 19',
                styling: 'Tailwind CSS v4',
                language: 'TypeScript',
                icons: 'Lucide',
                stateManagement: 'React Hooks',
              },
              dataModels: [],
              apiContracts: [],
              securityRules: [],
              uiGuidelines: [],
              milestones: [],
            },
            tasks: project.tasks.map((t) => ({
              id: t.id,
              projectId: project.id,
              title: t.title,
              category: t.category,
              description: t.description,
              targetFiles: t.targetFiles,
              dependencies: t.dependencies,
              assignedModelId: t.assignedModel,
              assignedProvider: t.assignedModel.includes('gemini') ? 'gemini' : 'openai',
              routingReason: t.routingReason || `Assigned to ${t.assignedModel} via Nexora task router.`,
              fallbackModelId: t.fallbackModel,
              status: t.status === 'completed' ? 'completed' : 'pending',
              retryCount: t.retryCount || 0,
              maxRetries: 2,
              idempotencyKey: t.idempotencyKey || `idem-${t.id}`,
              outputFiles: [],
              logs: t.logs || [],
            })),
            concurrencyLimit: project.concurrencyLimit || 2,
            totalEstimatedTokens: 14000,
            createdAt: Date.now(),
          };

          await fetch('/api/orchestrator/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: planPayload }),
          });
        }
      } catch (err) {
        console.warn('[WorkspaceView] Orchestrator polling error:', err);
      }
    };

    const interval = setInterval(pollBackendQueue, 1500);
    pollBackendQueue();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project.id, project.status, isPaused]);

  // Handle Pause / Resume via backend
  const handleTogglePause = async () => {
    const next = !isPaused;
    setIsPaused(next);
    try {
      if (next) {
        await fetch(`/api/orchestrator/pause/${project.id}`, { method: 'POST' });
        setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ⏸ Orchestration queue paused.`]);
      } else {
        await fetch(`/api/orchestrator/resume/${project.id}`, { method: 'POST' });
        setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ▶ Orchestration queue resumed.`]);
      }
    } catch (e) {
      console.warn('Pause error:', e);
    }
  };

  // Handle Task Manual Retry
  const handleRetryTask = async (taskId: string) => {
    try {
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ⟲ Queued manual retry for [${taskId}]...`,
      ]);
      await fetch(`/api/orchestrator/retry-task/${project.id}/${taskId}`, { method: 'POST' });
      setIsPaused(false);
    } catch (e) {
      console.warn('Retry error:', e);
    }
  };

  // Handle Task Reassignment
  const handleReassignModel = async (taskId: string, targetModelId: string) => {
    try {
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ⇄ Reassigning [${taskId}] to ${targetModelId}...`,
      ]);
      await fetch(`/api/orchestrator/reassign-task/${project.id}/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetModelId }),
      });
      setReassigningTaskId(null);
      setIsPaused(false);
    } catch (e) {
      console.warn('Reassign error:', e);
    }
  };

  // Code editor save
  const handleSaveCode = () => {
    if (project.files[activeFilePath]) {
      const updatedFiles = {
        ...project.files,
        [activeFilePath]: {
          ...project.files[activeFilePath],
          content: editedCode,
          lastModified: Date.now(),
          version: project.files[activeFilePath].version + 1,
        },
      };

      onUpdateProject({
        ...project,
        files: updatedFiles,
        updatedAt: Date.now(),
      });

      setPreviewKey((k) => k + 1);
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Saved and recompiled: ${activeFilePath}`,
      ]);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(editedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Natural language refinement
  const handleRefineProject = async () => {
    if (!refinePrompt.trim() || isRefining) return;
    setIsRefining(true);

    setTerminalLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [Router] Analyzing refinement request: "${refinePrompt}"`,
    ]);

    try {
      const targetPath = 'src/App.tsx';
      const currentCode = project.files[targetPath]?.content || editedCode;

      const response = await fetch('/api/auto-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: `User requested feature modification: ${refinePrompt}. Please enhance the application code accordingly while preserving existing functional state.`,
          filePath: targetPath,
          currentCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.repairedCode) {
          const updatedFiles = {
            ...project.files,
            [targetPath]: {
              path: targetPath,
              content: data.repairedCode,
              language: 'typescript' as const,
              lastModified: Date.now(),
              createdByTask: 'refinement',
              version: (project.files[targetPath]?.version || 1) + 1,
            },
          };

          onUpdateProject({
            ...project,
            files: updatedFiles,
            updatedAt: Date.now(),
          });

          setEditedCode(data.repairedCode);
          setPreviewKey((k) => k + 1);
          setRefinePrompt('');
          setTerminalLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✓ Refinement applied to ${targetPath}: ${data.explanation}`,
          ]);
        }
      }
    } catch (err) {
      console.error('Refine failed:', err);
    } finally {
      setIsRefining(false);
    }
  };

  // Auto Repair / Self-healing trigger
  const handleTriggerAutoRepair = async (issue: TestCheckItem) => {
    setIsRepairing(true);
    setTerminalLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [Self-Healing] Dispatched repair agent for: ${issue.name}`,
    ]);

    try {
      const result = await TestRunner.executeAutoRepair(issue, project.files);
      if (result.success) {
        setRepairExplanation(result.explanation);
        const updatedFiles = {
          ...project.files,
          [result.repairedFile]: {
            ...project.files[result.repairedFile],
            content: result.newContent,
            lastModified: Date.now(),
            version: (project.files[result.repairedFile]?.version || 1) + 1,
          },
        };

        // Re-run test suite
        const newTests = TestRunner.runTestSuite(updatedFiles);

        onUpdateProject({
          ...project,
          files: updatedFiles,
          testResults: newTests,
        });

        setPreviewKey((k) => k + 1);
        setTerminalLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ Self-healing patch applied: ${result.explanation}`,
        ]);
      }
    } catch (err) {
      console.error('Auto repair error:', err);
    } finally {
      setIsRepairing(false);
    }
  };

  // Export full ZIP
  const handleExportZip = async () => {
    try {
      await ExportService.exportProjectAsZip(project);
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Complete project ZIP archive generated and downloaded.`,
      ]);
    } catch (err) {
      console.error('Export ZIP error:', err);
    }
  };

  const completedCount = project.tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = Math.round((completedCount / (project.tasks.length || 1)) * 100);
  const selectedTask = project.tasks.find((t) => t.id === selectedTaskId) || project.tasks[0];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#070b14] overflow-hidden select-none">
      {/* Top Workspace Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-[#060a10]/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <NexoraLogo size="sm" showText={true} showTagline={false} />
          
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px]">{project.name}</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {project.type}
            </span>
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                project.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : project.status === 'verifying'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse font-bold'
                  : project.status === 'generating' || project.status === 'running'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {project.status === 'verifying' ? 'Sandbox Verifying' : project.status} ({progressPercent}%)
            </span>

            {/* Active Concurrent Workers Gauge */}
            {activeWorkersCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <Network className="w-3 h-3" />
                <span>{activeWorkersCount} Parallel Workers Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {(project.status === 'generating' || project.status === 'running') && (
            <button
              onClick={handleTogglePause}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isPaused ? 'Resume Queue' : 'Pause Queue'}</span>
            </button>
          )}

          <button
            onClick={() => setCenterTab('tests')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Run Automated Tests & Self-Healing Repairs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test & Repair</span>
          </button>

          <button
            onClick={handleExportZip}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column IDE Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Task Pipeline & DAG */}
        <div className="w-84 border-r border-slate-800/80 bg-[#080d14] flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  DAG Queue ({completedCount}/{project.tasks.length})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <span>Concurrency: {project.concurrencyLimit || 2} workers</span>
                {activeWorkersCount > 0 && <span className="text-emerald-400">({activeWorkersCount} running)</span>}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setTaskViewMode('list')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  taskViewMode === 'list' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setTaskViewMode('dag')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  taskViewMode === 'dag' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                }`}
              >
                DAG
              </button>
            </div>
          </div>

          {/* Task Progress Bar */}
          <div className="w-full bg-slate-900 h-1">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Task List Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {taskViewMode === 'list' ? (
              project.tasks.map((task, idx) => {
                const assignedModelObj = models.find((m) => m.id === task.assignedModel);
                const isRunning = task.status === 'running';
                const isCompleted = task.status === 'completed';
                const isFailed = task.status === 'failed';
                const isSelected = selectedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-950/20 shadow-sm'
                        : isRunning
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : isFailed
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : isCompleted
                        ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-100 truncate max-w-[170px]">
                          {task.title}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {isRunning && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}
                      {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {!isCompleted && !isRunning && !isFailed && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {task.dependencies.length > 0 ? 'Waiting' : 'Pending'}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/40">
                      <span className="flex items-center gap-1">
                        <span>{assignedModelObj?.avatar || '🤖'}</span>
                        <span className="text-slate-300">{assignedModelObj?.name || task.assignedModel}</span>
                      </span>

                      {task.dependencies.length > 0 && (
                        <span className="text-slate-500">
                          Deps: {task.dependencies.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Visual Dependency Graph (DAG) */
              <div className="p-2 space-y-2">
                <div className="text-[11px] text-slate-400 font-mono mb-2">
                  Topological Execution Graph
                </div>
                {project.tasks.map((task, idx) => {
                  const isSelected = selectedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-2 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-mono shrink-0 ${
                            task.status === 'completed'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                              : task.status === 'running'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                              : task.status === 'failed'
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-slate-200 truncate">{task.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                            <span>{task.assignedModel}</span>
                            {task.dependencies.length > 0 && (
                              <span className="text-slate-500">← {task.dependencies.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Task Inspection & Control Card */}
          {selectedTask && (
            <div className="p-3 border-t border-slate-800 bg-[#060a10]/95 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">
                  Task Inspector: [{selectedTask.id}]
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  selectedTask.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  selectedTask.status === 'running' ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' :
                  selectedTask.status === 'failed' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {selectedTask.status}
                </span>
              </div>

              {selectedTask.routingReason && (
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-300 leading-tight">
                  <div className="text-[9px] uppercase font-mono text-slate-500 font-semibold mb-0.5">
                    Objective Routing Evaluation
                  </div>
                  <div>{selectedTask.routingReason}</div>
                </div>
              )}

              {selectedTask.idempotencyKey && (
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Idempotency Hash:</span>
                  <span className="text-slate-300 font-bold">{selectedTask.idempotencyKey}</span>
                </div>
              )}

              {/* Action buttons for task: Retry & Reassign */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleRetryTask(selectedTask.id)}
                  className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 border border-slate-700"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Retry Task</span>
                </button>

                <div className="flex-1 relative">
                  <select
                    value={selectedTask.assignedModel}
                    onChange={(e) => handleReassignModel(selectedTask.id, e.target.value)}
                    className="w-full py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-medium border border-slate-700 cursor-pointer focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Reassign Model...</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER PANEL: Tabs (Preview, Code, Files, Logs, Tests) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#070b14]">
          {/* Center Tabs Navigation */}
          <div className="h-10 border-b border-slate-800 bg-slate-950/60 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCenterTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'preview'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>

              <button
                onClick={() => setCenterTab('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'code'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code Editor</span>
              </button>

              <button
                onClick={() => setCenterTab('files')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'files'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Files ({Object.keys(project.files).length})</span>
              </button>

              <button
                onClick={() => setCenterTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'logs'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal Logs</span>
              </button>

              <button
                onClick={() => setCenterTab('tests')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'tests'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Tests ({project.testResults.length})</span>
              </button>

              <button
                onClick={() => setCenterTab('integration')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'integration'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(0,255,163,0.15)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>VFS & Integration</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                  {project.integrationHealth || 100}%
                </span>
              </button>

              <button
                onClick={() => setCenterTab('sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  centerTab === 'sandbox'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sandbox VM & Build</span>
                {project.status === 'verifying' ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/30 text-cyan-300 animate-pulse font-bold">
                    Running
                  </span>
                ) : project.sandboxReport?.overallPassed ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                    Passed
                  </span>
                ) : project.sandboxReport ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-500/20 text-red-400 font-bold">
                    Failed
                  </span>
                ) : null}
              </button>
            </div>

            {/* Viewport controls for preview */}
            {centerTab === 'preview' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setDeviceMode('desktop')}
                    className={`p-1 rounded ${deviceMode === 'desktop' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500'}`}
                    title="Desktop (100%)"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceMode('tablet')}
                    className={`p-1 rounded ${deviceMode === 'tablet' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500'}`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceMode('mobile')}
                    className={`p-1 rounded ${deviceMode === 'mobile' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500'}`}
                    title="Mobile (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  title="Reload preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: Live Interactive Preview */}
          {centerTab === 'preview' && (
            <div className="flex-1 bg-[#050811] flex items-center justify-center p-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#070b14] flex flex-col ${
                  deviceMode === 'desktop'
                    ? 'w-full'
                    : deviceMode === 'tablet'
                    ? 'w-[768px]'
                    : 'w-[375px]'
                }`}
              >
                <div className="h-6 bg-slate-900 border-b border-slate-800 px-3 flex items-center gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                  <div className="ml-2 px-3 py-0.5 rounded bg-slate-950 text-[10px] text-slate-400 font-mono truncate max-w-sm">
                    https://sandbox.nexusai.local/{project.name.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                </div>

                <iframe
                  key={previewKey}
                  title="NexusAI Live Sandbox Preview"
                  srcDoc={integrationReport.bundleHtml}
                  sandbox="allow-scripts allow-modals allow-same-origin"
                  className="flex-1 w-full h-full border-none bg-[#070b14]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Code Editor */}
          {centerTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
              {/* File bar */}
              <div className="h-9 border-b border-slate-800 bg-[#0b0f19] px-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {Object.keys(project.files).map((filePath) => (
                    <button
                      key={filePath}
                      onClick={() => setActiveFilePath(filePath)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        activeFilePath === filePath
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filePath.split('/').pop()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleSaveCode}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
                  >
                    Save & Recompile
                  </button>
                </div>
              </div>

              {/* Code TextArea with Line Numbers */}
              <div className="flex-1 flex overflow-hidden">
                <div className="w-12 bg-[#090d16] text-slate-600 text-xs font-mono py-3 select-none text-right pr-3 shrink-0 border-r border-slate-800/80">
                  {editedCode.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                <textarea
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  className="flex-1 p-3 bg-transparent text-slate-200 font-mono text-xs focus:outline-none resize-none overflow-auto leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* TAB 3: File Explorer */}
          {centerTab === 'files' && (
            <div className="flex-1 p-6 overflow-y-auto bg-[#070b14]">
              <div className="max-w-3xl mx-auto space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Virtual Project Repository Structure</span>
                </h3>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/60 font-mono text-xs">
                  {Object.entries(project.files).map(([path, file]) => (
                    <div
                      key={path}
                      onClick={() => {
                        setActiveFilePath(path);
                        setCenterTab('code');
                      }}
                      className="p-3.5 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2 text-slate-200">
                        <Code2 className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold">{path}</span>
                      </div>

                      <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                        <span>v{file.version}</span>
                        <span>{file.content.length} chars</span>
                        <span className="text-cyan-400 hover:underline">Edit Code &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Build & Terminal Logs */}
          {centerTab === 'logs' && (
            <div className="flex-1 p-4 bg-[#050811] font-mono text-xs text-slate-300 overflow-y-auto space-y-1">
              <div className="text-slate-500 mb-2">
                # NexusAI Orchestration Terminal [Session active]
              </div>
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed hover:bg-slate-900/40 px-1 rounded">
                  {log}
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: Automated Tests & Self-Healing Repairs */}
          {centerTab === 'tests' && (
            <div className="flex-1 p-6 overflow-y-auto bg-[#070b14]">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span>Automated Test Suite & Self-Healing Engine</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Continuous verification across TypeScript, OWASP security, API contracts, and WCAG accessibility.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const newTests = TestRunner.runTestSuite(project.files);
                      onUpdateProject({ ...project, testResults: newTests });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rerun All Tests</span>
                  </button>
                </div>

                {repairExplanation && (
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-300 flex items-start gap-3">
                    <Wrench className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-200">Self-Healing Patch Applied</div>
                      <p className="mt-0.5 text-slate-300">{repairExplanation}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {project.testResults.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        {test.status === 'passed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                            <span>{test.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {test.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{test.message}</p>
                        </div>
                      </div>

                      {test.status === 'failed' && test.autoRepairable && (
                        <button
                          onClick={() => handleTriggerAutoRepair(test)}
                          disabled={isRepairing}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/20"
                        >
                          {isRepairing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                          <span>Auto-Repair via AI</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Shared Virtual Filesystem & Code Integration Engine */}
          {centerTab === 'integration' && (
            <IntegrationInspectorView
              project={project}
              onSelectFile={(filePath) => {
                setActiveFilePath(filePath);
                setCenterTab('code');
              }}
            />
          )}

          {/* TAB 7: Sandboxed Execution Environment & Automated Build Verification */}
          {centerTab === 'sandbox' && (
            <SandboxExecutionView
              project={project}
              onNavigateToFile={(filePath) => {
                setActiveFilePath(filePath);
                setCenterTab('code');
              }}
            />
          )}
        </div>

        {/* RIGHT PANEL: AI Activity Stream & Refine Controls */}
        <div className="w-80 border-l border-slate-800/80 bg-[#090d16] flex flex-col shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-AI Activity</span>
            </span>

            <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
              Live Stream
            </span>
          </div>

          {/* Model Stats Card */}
          <div className="p-3 border-b border-slate-800/60 bg-slate-950/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tokens Generated:</span>
              <span className="font-mono text-white font-semibold">
                {project.stats.totalTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Est. Compute Cost:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ${project.stats.estimatedCost.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Live Activity Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active model calls. Generate or refine to see live inference telemetry.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{models.find((m) => m.id === act.modelId)?.avatar || '🤖'}</span>
                      <span>{act.modelName}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{act.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Natural Language Refinement Drawer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Refine with Prompt
              </span>
              <span className="text-[10px] text-slate-500">Smart Target Edit</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefineProject()}
                placeholder="e.g. Add dark/light toggle, CSV export..."
                disabled={isRefining}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={handleRefineProject}
                disabled={!refinePrompt.trim() || isRefining}
                className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors"
              >
                {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
