import React, { useState } from 'react';
import { 
  ListTree, CheckCircle2, RefreshCw, AlertTriangle, 
  Layers, Clock, Cpu, ExternalLink, GitBranch
} from 'lucide-react';
import { Project, AIModel, TaskStatus } from '../../types';

interface TaskManagerViewProps {
  projects: Project[];
  models: AIModel[];
  onOpenProjectWorkspace: (id: string) => void;
}

export const TaskManagerView: React.FC<TaskManagerViewProps> = ({
  projects,
  models,
  onOpenProjectWorkspace,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Collect all tasks across projects
  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({
      ...t,
      projectName: p.name,
      projectId: p.id,
    }))
  );

  const filteredTasks = allTasks.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Global AI Task Pipeline & Dispatcher</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of all decomposed tasks, dependency graphs, and model assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses ({allTasks.length})</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Task Queue Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Decomposed Tasks Queue ({filteredTasks.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Dynamic execution engine</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Assigned Model</th>
                <th className="py-3 px-4">Dependencies</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTasks.map((task) => {
                const assignedModelObj = models.find((m) => m.id === task.assignedModel);
                return (
                  <tr key={`${task.projectId}-${task.id}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {task.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {task.status === 'running' && (
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                        )}
                        {task.status === 'pending' && (
                          <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0"></span>
                        )}
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-[150px] truncate">
                      {task.projectName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {task.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      <span className="flex items-center gap-1.5 font-sans">
                        <span>{assignedModelObj?.avatar || '🤖'}</span>
                        <span>{assignedModelObj?.name || task.assignedModel}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {task.dependencies.length > 0 ? (
                        <span className="text-cyan-400">{task.dependencies.length} prereq(s)</span>
                      ) : (
                        <span className="text-slate-500">None (Parallel)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-sans uppercase font-semibold ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : task.status === 'running'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenProjectWorkspace(task.projectId)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-sans inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Workspace</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
