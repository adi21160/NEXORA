import React from 'react';
import { 
  Cpu, Plus, Layers, ShieldCheck, Zap, 
  Terminal, Sparkles, ExternalLink, HelpCircle
} from 'lucide-react';
import { Project, AIModel } from '../../types';
import { NexoraLogo } from '../brand/NexoraLogo';

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  models: AIModel[];
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  models,
  onNavigate,
  currentView,
}) => {
  const connectedModels = models.filter((m) => m.status === 'connected' || m.status === 'ready');

  return (
    <header className="h-14 border-b border-slate-800 bg-[#070c12]/95 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer group flex items-center"
        >
          <NexoraLogo size="sm" showText={true} showTagline={false} />
        </div>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500">Active:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Model Status Indicator & Navigation Quick Links */}
      <div className="flex items-center gap-3">
        {/* Connected Models Pill */}
        <div 
          onClick={() => onNavigate('models')}
          className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs text-slate-300 transition-colors"
          title="Click to manage AI Models & Providers"
        >
          <div className="flex -space-x-1 items-center">
            {models.slice(0, 4).map((m) => (
              <span key={m.id} className="text-xs" title={`${m.name} (${m.status})`}>
                {m.avatar}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {connectedModels.length}/{models.length} Models Online
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* Quota Quick Meter */}
        <div 
          onClick={() => onNavigate('quotas')}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs text-slate-300 transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">$12.84 / $50.00</span>
        </div>

        {/* Build New Project Button */}
        <button
          onClick={onOpenNewProjectModal}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Build New Project</span>
          <span className="sm:hidden">Build</span>
        </button>

        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
            NX
          </div>
        </div>
      </div>
    </header>
  );
};
