import React from 'react';
import { 
  LayoutDashboard, PlusCircle, FolderGit2, Cpu, 
  ListTree, PieChart, Settings, HelpCircle, Code2, Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewProjectModal: () => void;
  projectsCount: number;
  activeTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenNewProjectModal,
  projectsCount,
  activeTasksCount,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'workspace',
      label: 'Live Workspace',
      icon: Code2,
      badge: activeTasksCount > 0 ? `${activeTasksCount} active` : null,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    },
    {
      id: 'projects',
      label: 'My Projects',
      icon: FolderGit2,
      badge: `${projectsCount}`,
      badgeColor: 'bg-slate-800 text-slate-400',
    },
    {
      id: 'models',
      label: 'AI Models',
      icon: Cpu,
      badge: '6 models',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'task-manager',
      label: 'Task Manager',
      icon: ListTree,
      badge: null,
    },
    {
      id: 'quotas',
      label: 'Usage & Quotas',
      icon: PieChart,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
    {
      id: 'help',
      label: 'Help & Docs',
      icon: HelpCircle,
      badge: null,
    },
  ];

  return (
    <aside className="w-56 border-r border-slate-800/80 bg-[#090d16] flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none">
      <div className="p-3 space-y-4">
        {/* Quick Launch Button */}
        <button
          onClick={onOpenNewProjectModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all group shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Project</span>
        </button>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800/90 text-cyan-300 border border-slate-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Engine Status Card */}
      <div className="p-3 border-t border-slate-800/60 bg-slate-900/30">
        <div className="rounded-lg p-2.5 bg-slate-950/60 border border-emerald-500/20 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Nexora Engine</span>
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Orchestrating
            </span>
          </div>
          <p className="text-slate-400 text-[10px] leading-tight italic">
            "One Intelligence. Multiple Minds."
          </p>
        </div>
      </div>
    </aside>
  );
};
