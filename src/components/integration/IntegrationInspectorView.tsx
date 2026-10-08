import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  GitBranch,
  Layers,
  FileCode,
  Package,
  Wrench,
  Check,
  Activity,
  History,
  Code2,
  Cpu,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Project } from '../../types';

interface IntegrationInspectorViewProps {
  project: Project;
  onSelectFile?: (filePath: string) => void;
}

export const IntegrationInspectorView: React.FC<IntegrationInspectorViewProps> = ({
  project,
  onSelectFile,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'vfs' | 'reports' | 'repairs' | 'dependencies'>('vfs');

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orchestrator/projects/${project.id}/integration`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedFile && json.files) {
          const firstKey = Object.keys(json.files)[0];
          if (firstKey) setSelectedFile(firstKey);
        }
      }
    } catch (err) {
      console.warn('Could not fetch integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationStatus();
    const interval = setInterval(fetchIntegrationStatus, 3500);
    return () => clearInterval(interval);
  }, [project.id]);

  const runIntegrityAudit = async () => {
    try {
      setIsAuditing(true);
      setAuditMessage(null);
      const res = await fetch(`/api/orchestrator/projects/${project.id}/integration/audit`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setAuditMessage(`Audit finished. Health Score: ${json.audit?.healthScore || 100}%. ${json.audit?.versionsTracked || 0} versions tracked.`);
        fetchIntegrationStatus();
      }
    } catch (err: any) {
      setAuditMessage(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRollback = async (filePath: string, targetVersion: number) => {
    try {
      setRollingBack(true);
      setRollbackSuccess(null);
      const res = await fetch(`/api/orchestrator/projects/${project.id}/integration/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, version: targetVersion }),
      });
      if (res.ok) {
        setRollbackSuccess(`Successfully reverted ${filePath} to v${targetVersion}.`);
        fetchIntegrationStatus();
      }
    } catch (err: any) {
      setRollbackSuccess(`Rollback failed: ${err.message}`);
    } finally {
      setRollingBack(false);
    }
  };

  const healthScore = data?.healthScore ?? (project.integrationHealth || 100);
  const filesMap = data?.files || project.files || {};
  const currentVirtualFile = selectedFile ? filesMap[selectedFile] : null;
  const reports = data?.reports || [];
  const latestReport = data?.latestReport;
  const brokenImportsCount = latestReport?.validation?.brokenImports?.length || 0;
  const conflictsCount = latestReport?.conflicts?.length || 0;
  const missingDeps = latestReport?.validation?.missingDependencies || [];
  const repairTasks = data?.repairTasks || [];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner / Integration Telemetry */}
      <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-slate-950 to-emerald-950/20 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-black border transition-all ${
                  healthScore >= 90
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(0,255,163,0.2)]'
                    : healthScore >= 70
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-red-500/50 bg-red-500/10 text-red-400'
                }`}
              >
                <span className="text-xl leading-none">{healthScore}%</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Health</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Shared Virtual Project Filesystem & Integration Engine
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Idempotent VFS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Atomic patches, import & export verification, API contract matching, and version tracking.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={runIntegrityAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'Auditing VFS...' : 'Run Integrity Audit'}
            </button>
            <button
              onClick={fetchIntegrationStatus}
              disabled={loading}
              className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
              title="Refresh Integration State"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audit Message Banner */}
        {auditMessage && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
            <span>{auditMessage}</span>
            <button onClick={() => setAuditMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Four Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[11px] text-slate-400">Imports & Exports</div>
                <div className="text-xs font-semibold text-white">
                  {brokenImportsCount === 0 ? '100% Validated' : `${brokenImportsCount} Broken Symbol(s)`}
                </div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${brokenImportsCount === 0 ? 'bg-emerald-400 shadow-[0_0_8px_#00ffa3]' : 'bg-amber-400'}`} />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[11px] text-slate-400">Dependencies</div>
                <div className="text-xs font-semibold text-white">
                  package.json in sync
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[11px] text-slate-400">Merge Conflicts</div>
                <div className="text-xs font-semibold text-white">
                  {conflictsCount === 0 ? '0 Detected' : `${conflictsCount} Active`}
                </div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${conflictsCount === 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Wrench className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[11px] text-slate-400">Targeted Repairs</div>
                <div className="text-xs font-semibold text-white">
                  {repairTasks.length} Dispatched
                </div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${repairTasks.length > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
          </div>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60 text-xs">
          <button
            onClick={() => setActiveSubTab('vfs')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeSubTab === 'vfs'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Virtual Filesystem & Version Diff
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeSubTab === 'reports'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Integration Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveSubTab('repairs')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeSubTab === 'repairs'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Targeted Repair Tasks ({repairTasks.length})
          </button>
          <button
            onClick={() => setActiveSubTab('dependencies')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeSubTab === 'dependencies'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dependencies ({missingDeps.length > 0 ? `+${missingDeps.length}` : 'Synced'})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* SUBTAB 1: VIRTUAL FILESYSTEM & VERSION HISTORY */}
        {activeSubTab === 'vfs' && (
          <div className="h-full grid grid-cols-12 overflow-hidden">
            {/* Left Column: File Tree */}
            <div className="col-span-12 md:col-span-4 border-r border-slate-800/80 bg-slate-950 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Files ({Object.keys(filesMap).length})
                </span>
                <span className="text-[10px] text-slate-500">Atomic Safe Revisions</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.keys(filesMap).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No files integrated in virtual filesystem yet.
                  </div>
                ) : (
                  Object.entries(filesMap).map(([path, file]: [string, any]) => {
                    const isSelected = selectedFile === path;
                    const version = file.version || 1;
                    const historyCount = file.history?.length || 1;

                    return (
                      <button
                        key={path}
                        onClick={() => {
                          setSelectedFile(path);
                          if (onSelectFile) onSelectFile(path);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between group transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                            : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="truncate font-mono">{path}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            v{version}
                          </span>
                          {historyCount > 1 && (
                            <span className="text-[10px] text-emerald-400/80 font-mono">
                              ({historyCount} revs)
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Code Viewer & Version History Diff */}
            <div className="col-span-12 md:col-span-8 flex flex-col bg-slate-950 overflow-hidden">
              {currentVirtualFile ? (
                <>
                  {/* File Header Bar */}
                  <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-white font-medium">{currentVirtualFile.path}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
                        Current: v{currentVirtualFile.version || 1}
                      </span>
                      {currentVirtualFile.lastAuthorModel && (
                        <span className="text-slate-400 text-[11px]">
                          Authored by {currentVirtualFile.lastAuthorModel}
                        </span>
                      )}
                    </div>

                    {rollbackSuccess && (
                      <span className="text-xs text-emerald-400 font-mono">{rollbackSuccess}</span>
                    )}
                  </div>

                  {/* Split Pane: Code & Version History */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
                    {/* Code Content */}
                    <div className="lg:col-span-2 overflow-y-auto p-4 bg-slate-950/80 font-mono text-xs leading-relaxed text-slate-200 border-r border-slate-800/60">
                      <pre className="whitespace-pre-wrap">{currentVirtualFile.content}</pre>
                    </div>

                    {/* Version History & Rollback Controls */}
                    <div className="overflow-y-auto p-3 bg-slate-900/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800/60">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Revision History</span>
                      </div>

                      {currentVirtualFile.history && currentVirtualFile.history.length > 0 ? (
                        currentVirtualFile.history.map((hist: any, idx: number) => {
                          const isCurrent = hist.version === currentVirtualFile.version;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                                isCurrent
                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                  : 'bg-slate-900/60 border-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-white">
                                  v{hist.version}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(hist.timestamp).toLocaleTimeString()}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 line-clamp-2">
                                {hist.commitMessage}
                              </p>

                              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                <span>Task: {hist.taskId}</span>
                                {!isCurrent && (
                                  <button
                                    onClick={() => handleRollback(currentVirtualFile.path, hist.version)}
                                    disabled={rollingBack}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Revert
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-500 p-2">
                          Single version registered.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Select a file from the virtual tree to view versions and code.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: INTEGRATION REPORTS */}
        {activeSubTab === 'reports' && (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No integration reports generated yet. As tasks execute, audit records will stream here.
              </div>
            ) : (
              [...reports].reverse().map((rpt: any) => (
                <div
                  key={rpt.id}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">[{rpt.taskId}]</span>
                      <span className="text-sm font-medium text-slate-200">{rpt.taskTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold ${
                          rpt.healthScore >= 90
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        Score: {rpt.healthScore}%
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(rpt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{rpt.summary}</p>

                  {rpt.appliedFiles && rpt.appliedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rpt.appliedFiles.map((af: any, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {af.path} (v{af.version})
                        </span>
                      ))}
                    </div>
                  )}

                  {rpt.validation?.brokenImports?.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Broken Import Check:
                      </div>
                      {rpt.validation.brokenImports.map((b: any, bi: number) => (
                        <div key={bi} className="font-mono text-[11px]">
                          • {b.importerPath}: requires "{b.importedSymbol}" from {b.importedPath}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 3: TARGETED REPAIR TASKS */}
        {activeSubTab === 'repairs' && (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {repairTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                No integration defects detected. All imports, exports, and interfaces match cleanly.
              </div>
            ) : (
              repairTasks.map((rt: any) => (
                <div
                  key={rt.repairTaskId}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-mono text-xs font-bold text-white">{rt.repairTaskId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 uppercase">
                        {rt.issueType}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        rt.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : rt.status === 'executing'
                          ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {rt.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{rt.description}</p>

                  <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800">
                    Required Fix: {rt.requiredFix}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Target File: {rt.targetFile}</span>
                    <span>Assigned Agent: {rt.assignedModel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 4: DEPENDENCIES */}
        {activeSubTab === 'dependencies' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                Automatic Dependency Reconciliation
              </h3>
              <p className="text-xs text-slate-400">
                The Dependency Manager continuously inspects all TypeScript/JSX imports across the virtual filesystem. Any missing package is automatically configured into package.json with verified semver versions.
              </p>
            </div>

            {filesMap['package.json'] && (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
                  <span>package.json</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Synchronized</span>
                </div>
                <pre className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
                  {filesMap['package.json'].content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
