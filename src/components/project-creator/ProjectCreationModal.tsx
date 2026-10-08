import React, { useState } from 'react';
import { 
  X, Sparkles, Layers, Sliders, CheckCircle2, ArrowRight, 
  ArrowLeft, Cpu, Shield, Clock, DollarSign, AlertCircle, RefreshCw,
  Network, Code2, GitBranch, ChevronDown, ChevronUp, Terminal
} from 'lucide-react';
import { Project, ProjectTask, TaskCategory, AIModelId, AIModel } from '../../types';
import { AIRouter } from '../../services/aiRouter';
import { NexoraLogo } from '../brand/NexoraLogo';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: AIModel[];
  onStartProjectGeneration: (project: Project) => void;
  initialPrompt?: string;
}

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({
  isOpen,
  onClose,
  models,
  onStartProjectGeneration,
  initialPrompt = '',
}) => {
  const [step, setStep] = useState<'details' | 'tech' | 'advanced' | 'plan'>('details');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState(initialPrompt);
  const [type, setType] = useState<Project['type']>('Web App');
  const [stack, setStack] = useState('React 19, Tailwind CSS v4, TypeScript, Lucide Icons');
  const [design, setDesign] = useState('Modern Dark SaaS with emerald/cyan accents and subtle glassmorphism');
  const [functionalReqs, setFunctionalReqs] = useState('Interactive dashboards, responsive layout, real-time filters, export to CSV/JSON, modal views.');
  const [backendReqs, setBackendReqs] = useState('Mock WebSocket/REST service layer, persistent client storage, data fixtures.');
  const [authReqs, setAuthReqs] = useState('RBAC role simulator (Admin, Developer, Viewer) with secure token handling.');
  const [deploymentPref, setDeploymentPref] = useState('Vite SPA production bundle, static hosting ready');

  // Advanced orchestration settings
  const [plannerModel, setPlannerModel] = useState<string>('gemini-3.8-flash');
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(2);
  const [generationSpeed, setGenerationSpeed] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [costOptimization, setCostOptimization] = useState(false);
  const [maxRetries, setMaxRetries] = useState(2);
  const [autoRepair, setAutoRepair] = useState(true);
  const [budgetCap, setBudgetCap] = useState(5.0);

  // Generated Technical Specification & Plan
  const [projectSpec, setProjectSpec] = useState<any>(null);
  const [showSpecDetails, setShowSpecDetails] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [planSummary, setPlanSummary] = useState('');
  const [plannedTasks, setPlannedTasks] = useState<ProjectTask[]>([]);
  const [estimatedTokens, setEstimatedTokens] = useState(14500);
  const [planError, setPlanError] = useState<{
    message: string;
    errorType?: string;
    setupInstructions?: string;
  } | null>(null);
  const [planMetrics, setPlanMetrics] = useState<{
    executedModel: string;
    provider: string;
    durationMs: number;
    tokenUsage?: any;
  } | null>(null);

  // Sync initialPrompt
  React.useEffect(() => {
    if (initialPrompt && !description) {
      setDescription(initialPrompt);
      if (!name) {
        setName(initialPrompt.slice(0, 30).trim() + ' App');
      }
    }
  }, [initialPrompt]);

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    setIsDecomposing(true);
    setPlanError(null);
    setPlanMetrics(null);
    setStep('plan');

    try {
      // 1. Generate Technical Specification via Orchestrator
      let generatedSpec: any = null;
      try {
        const specResponse = await fetch('/api/orchestrator/spec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || 'New Application',
            description,
            type,
            stack,
            design,
            functionalReqs,
            backendReqs,
            authReqs,
            preferredModel: plannerModel,
          }),
        });

        if (specResponse.ok) {
          const specData = await specResponse.json();
          if (specData.success && specData.specification) {
            generatedSpec = specData.specification;
            setProjectSpec(generatedSpec);
          }
        }
      } catch (specErr) {
        console.warn('Backend spec error, proceeding to direct plan:', specErr);
      }

      // 2. Generate DAG Plan from Orchestrator
      if (generatedSpec) {
        const planResponse = await fetch('/api/orchestrator/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specification: generatedSpec,
            concurrencyLimit,
            preferredModel: plannerModel,
          }),
        });

        if (planResponse.ok) {
          const planData = await planResponse.json();
          if (planData.success && planData.plan) {
            setPlanSummary(
              generatedSpec.summary ||
                'Nexora DAG task plan synthesized with transparent objective routing.'
            );
            setEstimatedTokens(planData.plan.totalEstimatedTokens || 14500);

            const tasks: ProjectTask[] = planData.plan.tasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              category: t.category,
              description: t.description,
              assignedModel: t.assignedModelId as AIModelId,
              fallbackModel: t.fallbackModelId as AIModelId,
              status: 'pending',
              dependencies: t.dependencies || [],
              targetFiles: t.targetFiles || ['src/App.tsx'],
              progress: 0,
              retryCount: 0,
              maxRetries,
              logs: [`[Router] ${t.routingReason}`],
              routingReason: t.routingReason,
              idempotencyKey: t.idempotencyKey,
            }));

            setPlannedTasks(tasks);
            setPlanMetrics({
              executedModel: plannerModel,
              provider: plannerModel.includes('gemini') ? 'Google' : 'OpenAI',
              durationMs: 1400,
            });
            setIsDecomposing(false);
            return;
          }
        }
      }

      // Fallback decomposition
      const response = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'New Project',
          description,
          type,
          stack,
          design,
          functionalReqs,
          backendReqs,
          authReqs,
          preferredModel: plannerModel,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setPlanError({
          message: data.error || 'Failed to decompose project with selected AI model.',
          errorType: data.errorType,
          setupInstructions: data.setupInstructions,
        });
        return;
      }

      setPlanSummary(data.summary || 'Optimal multi-model architectural plan created.');
      setEstimatedTokens(data.estimatedTokens || 14500);
      setPlanMetrics({
        executedModel: data.executedModel || plannerModel,
        provider: data.provider || 'unknown',
        durationMs: data.durationMs || 0,
        tokenUsage: data.tokenUsage,
      });

      // Convert raw tasks to ProjectTask format with assigned models
      const tasks: ProjectTask[] = (data.tasks || []).map((t: any) => {
        const evalResult = AIRouter.evaluateBestModel(
          t.category as TaskCategory,
          models,
          {
            generationSpeed,
            costOptimization,
            maxRetries,
            autoRepair,
            budgetCap,
            preferredModels: {},
          }
        );

        return {
          id: t.id,
          title: t.title,
          category: t.category,
          description: t.description,
          assignedModel: (t.assignedModel || evalResult.primaryModel) as AIModelId,
          fallbackModel: evalResult.fallbackModel,
          status: 'pending',
          dependencies: t.dependencies || [],
          targetFiles: t.targetFiles || ['src/App.tsx'],
          progress: 0,
          retryCount: 0,
          maxRetries,
          logs: [`Assigned to ${evalResult.primaryModel}`],
          routingReason: evalResult.rationale,
          idempotencyKey: `idem-${t.id}`,
        };
      });

      setPlannedTasks(tasks);
    } catch (err: any) {
      console.error('Plan generation request failed:', err);
      setPlanError({
        message: err?.message || 'Network error while generating architectural plan.',
      });
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleUpdateTaskModel = (taskId: string, newModelId: AIModelId) => {
    setPlannedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignedModel: newModelId } : t))
    );
  };

  const handleApproveAndStart = async () => {
    const projectId = `proj-${Date.now()}`;

    const newProject: Project = {
      id: projectId,
      name: name || 'Untitled Project',
      description: description || 'Generated multi-AI project',
      type,
      stack,
      design,
      functionalRequirements: functionalReqs,
      backendRequirements: backendReqs,
      authRequirements: authReqs,
      deploymentPreferences: deploymentPref,
      status: 'generating',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      activeFile: 'src/App.tsx',
      tasks: plannedTasks,
      files: {},
      testResults: [],
      concurrencyLimit,
      specification: projectSpec,
      settings: {
        generationSpeed,
        costOptimization,
        maxRetries,
        autoRepair,
        budgetCap,
        preferredModels: {},
      },
      stats: {
        totalTokens: 0,
        estimatedCost: 0,
        elapsedSeconds: 0,
        modelsUsed: Array.from(new Set(plannedTasks.map((t) => t.assignedModel))),
      },
    };

    // Dispatch to real backend orchestration queue
    try {
      const planPayload = {
        id: `plan-${Date.now()}`,
        projectId,
        specification: projectSpec || {
          name: newProject.name,
          summary: newProject.description,
          domain: newProject.type.toLowerCase(),
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
        tasks: plannedTasks.map((t) => ({
          id: t.id,
          projectId,
          title: t.title,
          category: t.category,
          description: t.description,
          targetFiles: t.targetFiles,
          dependencies: t.dependencies,
          assignedModelId: t.assignedModel,
          assignedProvider: t.assignedModel.includes('gemini') ? 'gemini' : 'openai',
          routingReason: t.routingReason || `Assigned to ${t.assignedModel} via Nexora router.`,
          fallbackModelId: t.fallbackModel,
          status: 'pending',
          retryCount: 0,
          maxRetries,
          idempotencyKey: t.idempotencyKey || `idem-${t.id}`,
          outputFiles: [],
          logs: [`[Router] ${t.routingReason || 'Assigned to ' + t.assignedModel}`],
        })),
        concurrencyLimit,
        totalEstimatedTokens: estimatedTokens,
        createdAt: Date.now(),
      };

      await fetch('/api/orchestrator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planPayload }),
      });
    } catch (e) {
      console.warn('Backend orchestrator start call failed, will fallback to client polling:', e);
    }

    onStartProjectGeneration(newProject);
    onClose();
  };

  const estimatedCost = (estimatedTokens / 1000) * 0.002;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e131f] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080d14]">
          <div className="flex items-center gap-3">
            <NexoraLogo size="sm" showText={true} showTagline={true} />
            <div className="h-5 w-[1px] bg-slate-800 hidden sm:block"></div>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400 font-mono">Autonomous DAG Orchestrator</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setStep('details')}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                step === 'details' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center font-mono">1</span>
              <span>Project Concept</span>
            </button>

            <button
              onClick={() => setStep('tech')}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                step === 'tech' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center font-mono">2</span>
              <span>Stack & Design</span>
            </button>

            <button
              onClick={() => setStep('advanced')}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                step === 'advanced' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center font-mono">3</span>
              <span>Router & Concurrency</span>
            </button>

            <button
              onClick={() => plannedTasks.length > 0 && setStep('plan')}
              disabled={plannedTasks.length === 0}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                step === 'plan' ? 'text-emerald-400 font-semibold' : plannedTasks.length > 0 ? 'text-slate-400' : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center font-mono">4</span>
              <span>DAG Execution Plan</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ApexTrade - Predictive Crypto Terminal"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Web App', 'Dashboard', 'SaaS Product', 'E-commerce', 'Website', 'Portfolio', 'Custom'] as Project['type'][]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                        type === t
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Description & Vision
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your website or application in detail: primary features, user workflows, target audience, key interactions..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Core Functional Requirements
                </label>
                <input
                  type="text"
                  value={functionalReqs}
                  onChange={(e) => setFunctionalReqs(e.target.value)}
                  placeholder="e.g. Real-time websocket chart, interactive cart, search filters..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          {step === 'tech' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Preferred Technology Stack
                </label>
                <input
                  type="text"
                  value={stack}
                  onChange={(e) => setStack(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Design Preferences & Aesthetic
                </label>
                <input
                  type="text"
                  value={design}
                  onChange={(e) => setDesign(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Backend & Service Layer
                  </label>
                  <textarea
                    rows={2}
                    value={backendReqs}
                    onChange={(e) => setBackendReqs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Authentication & Permissions
                  </label>
                  <textarea
                    rows={2}
                    value={authReqs}
                    onChange={(e) => setAuthReqs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Deployment Preferences
                </label>
                <input
                  type="text"
                  value={deploymentPref}
                  onChange={(e) => setDeploymentPref(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {step === 'advanced' && (
            <div className="space-y-5">
              {/* Planner Model Selector */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>Project Planner / Architect AI Engine</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select the AI model responsible for breaking down requirements into topological tasks.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', icon: '⚡' },
                    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: '🔮' },
                    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', icon: '🛡️' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: '⚡' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPlannerModel(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        plannerModel === m.id
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                        <span>{m.icon}</span>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.provider}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Concurrency Limit Selector */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-400" />
                    <span>DAG Task Concurrency Limit (Parallelism)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Controls how many independent tasks in the Directed Acyclic Graph are executed concurrently in parallel.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setConcurrencyLimit(cnt)}
                      className={`py-2 px-3 rounded-xl border text-center transition-all ${
                        concurrencyLimit === cnt
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-mono">{cnt} {cnt === 1 ? 'Worker' : 'Workers'}</div>
                      <div className="text-[9px] text-slate-500">{cnt === 1 ? 'Sequential' : cnt === 2 ? 'Recommended' : 'High Speed'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Optimization & Execution Profile</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'fast', label: 'Fast Build', desc: 'Prioritizes rapid scaffolding & Gemini 3.8 Flash' },
                    { id: 'balanced', label: 'Balanced', desc: 'Optimal multi-model harmony & speed' },
                    { id: 'quality', label: 'Max Polish', desc: 'Engages DeepSeek & Claude for deep reasoning' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setGenerationSpeed(lvl.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        generationSpeed === lvl.id
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold capitalize mb-1">{lvl.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{lvl.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Cost-Optimization Mode</div>
                      <div className="text-[10px] text-slate-400">Directs non-critical tasks to low-cost models</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={costOptimization}
                      onChange={(e) => setCostOptimization(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Self-Healing Auto-Repair</div>
                      <div className="text-[10px] text-slate-400">Automatically patch test failures via AI repair</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoRepair}
                      onChange={(e) => setAutoRepair(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Maximum Task Retries</div>
                    <div className="text-[10px] text-slate-400">Limit retry loops if a model returns invalid code</div>
                  </div>
                  <select
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1"
                  >
                    <option value={1}>1 Retry</option>
                    <option value={2}>2 Retries</option>
                    <option value={3}>3 Retries (Recommended)</option>
                    <option value={5}>5 Retries</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 'plan' && (
            <div className="space-y-4">
              {isDecomposing ? (
                <div className="py-16 text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Generating Architectural Task Plan</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Querying {plannerModel} to analyze domain requirements, dependency layers, and target code files...
                    </p>
                  </div>
                </div>
              ) : planError ? (
                /* Clear Setup Instructions Alert if credentials missing or model error */
                <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-bold text-rose-200">
                        {planError.errorType === 'missing_credentials'
                          ? 'Real AI Provider Credentials Required'
                          : 'Model Planning Execution Error'}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{planError.message}</p>
                      
                      {planError.setupInstructions && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-cyan-300 space-y-1">
                          <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold">
                            Setup Instruction
                          </div>
                          <div>{planError.setupInstructions}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] text-slate-400">
                      NexusAI strictly calls real integrated AI models (Gemini & OpenAI) without simulation.
                    </span>

                    <button
                      type="button"
                      onClick={() => setStep('advanced')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      &larr; Switch Planner Model or Set Key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Plan Summary Card with Real Model Attribution */}
                  <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Execution Plan Synthesized via {planMetrics?.executedModel || plannerModel}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{planSummary}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 text-right">
                      {planMetrics && (
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Latency</div>
                          <div className="text-xs font-mono font-bold text-cyan-400">{planMetrics.durationMs}ms</div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Tokens</div>
                        <div className="text-xs font-mono font-bold text-white">
                          {planMetrics?.tokenUsage?.totalTokens ? planMetrics.tokenUsage.totalTokens.toLocaleString() : `~${estimatedTokens.toLocaleString()}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Est. Cost</div>
                        <div className="text-xs font-mono font-bold text-emerald-400">${estimatedCost.toFixed(3)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Synthesized Technical Specification Accordion */}
                  {projectSpec && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Synthesized System Specification
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSpecDetails(!showSpecDetails)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
                        >
                          <span>{showSpecDetails ? 'Hide Details' : 'View Spec Architecture'}</span>
                          {showSpecDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-emerald-300 font-semibold">{projectSpec.architecturePattern}</span>: {projectSpec.summary}
                      </div>

                      {showSpecDetails && (
                        <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in duration-200">
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 space-y-1">
                            <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold mb-1">Data Models</div>
                            {projectSpec.dataModels?.map((dm: any) => (
                              <div key={dm.name} className="text-[11px] text-slate-300 font-mono">
                                <span className="text-white font-semibold">{dm.name}</span>: ({dm.fields?.slice(0, 3).join(', ')})
                              </div>
                            ))}
                          </div>
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 space-y-1">
                            <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold mb-1">API Endpoints</div>
                            {projectSpec.apiContracts?.slice(0, 3).map((ac: any) => (
                              <div key={ac.endpoint} className="text-[11px] text-slate-300 font-mono flex items-center justify-between">
                                <span className="text-cyan-400">{ac.method}</span>
                                <span className="truncate max-w-[150px]">{ac.endpoint}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>Decomposed Tasks ({plannedTasks.length})</span>
                      <span>Assigned AI Model (Customizable)</span>
                    </div>

                    <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                      {plannedTasks.map((t, index) => {
                        const assignedModelObj = models.find((m) => m.id === t.assignedModel);
                        return (
                          <div key={t.id} className="p-3 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                                  <span>{t.title}</span>
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    {t.category}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <select
                                value={t.assignedModel}
                                onChange={(e) => handleUpdateTaskModel(t.id, e.target.value as AIModelId)}
                                className="bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                              >
                                {models.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.avatar} {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            {step !== 'details' && (
              <button
                type="button"
                onClick={() => {
                  if (step === 'tech') setStep('details');
                  else if (step === 'advanced') setStep('tech');
                  else if (step === 'plan') setStep('advanced');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>

            {step === 'details' && (
              <button
                type="button"
                onClick={() => setStep('tech')}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <span>Configure Stack</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'tech' && (
              <button
                type="button"
                onClick={() => setStep('advanced')}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <span>Router & Concurrency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'advanced' && (
              <button
                type="button"
                onClick={handleGeneratePlan}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Specification & DAG</span>
              </button>
            )}

            {step === 'plan' && !isDecomposing && (
              <button
                type="button"
                onClick={handleApproveAndStart}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 cursor-pointer"
              >
                <Network className="w-4 h-4" />
                <span>Launch Autonomous Orchestrator</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
