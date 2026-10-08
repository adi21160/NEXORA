import React, { useState } from 'react';
import { 
  FolderGit2, Plus, Download, Copy, Trash2, 
  ExternalLink, Search, Filter, Clock, CheckCircle2, 
  RefreshCw, Sparkles, Layers, Code2
} from 'lucide-react';
import { Project } from '../../types';
import { ExportService } from '../../services/exportService';

interface MyProjectsViewProps {
  projects: Project[];
  onOpenProjectWorkspace: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({
  projects,
  onOpenProjectWorkspace,
  onOpenNewProjectModal,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.stack.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Project Repositories & History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted multi-AI projects, version snapshots, code artifacts, and exportable archives.
          </p>
        </div>

        <button
          onClick={onOpenNewProjectModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, stack, keyword..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Project Types</option>
            <option value="Dashboard">Dashboard</option>
            <option value="Web App">Web App</option>
            <option value="SaaS Product">SaaS Product</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Website">Website</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => {
          const completedTasks = p.tasks.filter((t) => t.status === 'completed').length;
          const progress = Math.round((completedTasks / (p.tasks.length || 1)) * 100);

          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {p.type}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${
                      p.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{p.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {p.description}
                </p>

                {/* Tech Stack Badge */}
                <div className="text-[11px] font-mono text-slate-400 line-clamp-1 mb-3">
                  Stack: {p.stack}
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Task Pipeline: {completedTasks}/{p.tasks.length}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => ExportService.exportProjectAsZip(p)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Download ZIP"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDuplicateProject(p.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Duplicate Project"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteProject(p.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onOpenProjectWorkspace(p.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Open IDE</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
