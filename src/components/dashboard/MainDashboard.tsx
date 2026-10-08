import React, { useState } from 'react';
import { 
  Sparkles, Plus, ArrowRight, Activity, Cpu, 
  Layers, ShieldCheck, Zap, Download, ExternalLink, 
  Clock, CheckCircle2, TrendingUp, FolderGit2, Play, Code2, Network, GitBranch
} from 'lucide-react';
import { Project, AIModel, QuotaStats } from '../../types';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../../data/projectTemplates';
import { NexoraLogo } from '../brand/NexoraLogo';

interface MainDashboardProps {
  projects: Project[];
  models: AIModel[];
  quotas: QuotaStats;
  onOpenNewProjectModal: (initialPrompt?: string) => void;
  onOpenProjectWorkspace: (projectId: string) => void;
  onNavigate: (view: string) => void;
  onStartFromTemplate: (template: ProjectTemplate) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  projects,
  models,
  quotas,
  onOpenNewProjectModal,
  onOpenProjectWorkspace,
  onNavigate,
  onStartFromTemplate,
}) => {
  const [quickPrompt, setQuickPrompt] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    onOpenNewProjectModal(quickPrompt);
  };

  const totalLinesOfCode = projects.reduce((acc, p) => {
    return acc + Object.values(p.files).reduce((fAcc, f) => fAcc + f.content.split('\n').length, 0);
  }, 0);

  const activeProjects = projects.filter((p) => p.status === 'generating');
  const recentProjects = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Hero Welcome Banner & High-Impact Prompt Box */}
      <div className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-[#0a1219]/90 via-[#070e14] to-[#04080c] p-6 md:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-5">
          {/* Logo & Tagline Emblem */}
          <NexoraLogo size="lg" showText={true} showTagline={true} glow={true} />

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-heading pt-1">
            Autonomous multi-model software synthesis with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              real-time DAG orchestration
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            Nexora transforms single-sentence concepts into rigorous system specifications and directed dependency graphs. Independent tasks are executed concurrently across eligible AI models, with automatic provider reassignment, idempotent file synthesis, and self-healing tests.
          </p>

          {/* Large Project Generation Prompt Box */}
          <form onSubmit={handleQuickSubmit} className="pt-2">
            <div className="relative flex items-center shadow-xl">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Describe any web application, SaaS platform, interactive dashboard, or tool..."
                className="w-full bg-[#03070a]/90 border border-slate-700/80 hover:border-emerald-500/50 focus:border-emerald-500 rounded-2xl pl-5 pr-36 py-4 text-sm md:text-base text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer"
              >
                <span>Orchestrate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
              <span className="text-slate-500">Quick ideas:</span>
              {[
                'Real-Time DevSecOps Telemetry Dashboard',
                'AI Agent Node Canvas with Graph Execution',
                'Headless E-Commerce Storefront with Stripe',
                'Interactive Crypto Order Book & Candlesticks',
              ].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => onOpenNewProjectModal(pill)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300 text-slate-400 text-[11px] transition-colors"
                >
                  + {pill}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{projects.length}</div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Integrated</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Tasks Executed</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {projects.reduce((acc, p) => acc + p.tasks.length, 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Distributed across 6 AI models</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Lines Generated</span>
            <Code2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {(totalLinesOfCode || 1840).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Zero-defect auto-integrated</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Compute Quota Used</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ${quotas.totalEstimatedCost.toFixed(2)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-400 h-full"
              style={{
                width: `${Math.min(100, (quotas.totalEstimatedCost / quotas.spendingLimit) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Connected AI Models Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Connected Multi-AI Model Ensemble
            </h2>
          </div>
          <button
            onClick={() => onNavigate('models')}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
          >
            Manage Providers &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {models.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-100">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.provider}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                      m.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25'
                    }`}
                  >
                    {m.status === 'connected' ? '● Connected' : '● Ready'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {m.specialty}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Latency: ~{m.latencyMs}ms</span>
                <span>Context: {m.contextWindow.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick-Start Project Templates Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Quick-Start Project Blueprints
            </h2>
          </div>
          <span className="text-xs text-slate-400">1-click automated decomposition</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROJECT_TEMPLATES.slice(0, 3).map((template) => (
            <div
              key={template.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {template.type}
                  </span>
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                    {template.badge}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-1">
                  {template.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {template.tagline}
                </p>
              </div>

              <button
                onClick={() => onStartFromTemplate(template)}
                className="w-full py-2 rounded-xl bg-slate-800 group-hover:bg-cyan-600 text-slate-200 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Launch Blueprint</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Projects</h2>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="text-xs text-cyan-400 hover:underline font-mono"
          >
            View All ({projects.length}) &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentProjects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {p.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{p.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {p.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{p.tasks.length} Tasks</span>
                  <span>•</span>
                  <span>{Object.keys(p.files).length} Files</span>
                </div>

                <button
                  onClick={() => onOpenProjectWorkspace(p.id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Open Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
