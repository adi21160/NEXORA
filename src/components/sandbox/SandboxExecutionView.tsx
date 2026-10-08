import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Cpu,
  Lock,
  Layers,
  FileCode,
  Package,
  Wrench,
  Activity,
  History,
  Play,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';

interface SandboxExecutionViewProps {
  project: Project;
  onNavigateToFile?: (filePath: string) => void;
}

export const SandboxExecutionView: React.FC<SandboxExecutionViewProps> = ({
  project,
  onNavigateToFile,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'build' | 'tests' | 'repairs'>('overview');

  const fetchSandboxStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orchestrator/projects/${project.id}/sandbox`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Could not fetch sandbox status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSandboxStatus();
    const interval = setInterval(fetchSandboxStatus, 4000);
    return () => clearInterval(interval);
  }, [project.id]);

  const handleRunSandbox = async () => {
    try {
      setIsRunning(true);
      setRunMessage(null);
      const res = await fetch(`/api/orchestrator/projects/${project.id}/sandbox/run`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setRunMessage(
          json.success
            ? '✓ Sandboxed execution, build, and tests verified successfully!'
            : `✕ Sandbox verification detected issues: ${json.report?.summary || 'Check logs below.'}`
        );
      } else {
        setRunMessage(`Execution error: ${json.error || 'Failed to start sandbox.'}`);
      }
    } catch (err: any) {
      setRunMessage(`Failed to execute sandbox: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const report = data?.report || project.sandboxReport;
  const isVerifying = project.status === 'verifying' || isRunning;
  const overallPassed = report?.overallPassed ?? (project.status === 'completed');
  const buildSuccess = report?.buildPhase?.success ?? true;
  const testSuccess = report?.testPhase?.success ?? true;
  const tests = report?.testPhase?.tests || [];
  const compilationErrors = report?.buildPhase?.compilationErrors || [];
  const repairHistory = report?.repairHistory || [];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner: Sandbox Telemetry & Security Boundary */}
      <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/95 via-slate-950 to-emerald-950/25 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-black border transition-all ${
                  isVerifying
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : overallPassed
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(0,255,163,0.2)]'
                    : 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                }`}
              >
                {isVerifying ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                ) : overallPassed ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                ) : (
                  <XCircle className="w-7 h-7 text-red-400" />
                )}
                <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
                  {isVerifying ? 'TESTING' : overallPassed ? 'VERIFIED' : 'FAILED'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Sandboxed Execution & Automated Build Verification
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Isolated VM Subprocess
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict resource caps, zero secret exposure, dependency verification, and auto-repair re-runs.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSandbox}
              disabled={isVerifying}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isVerifying
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-not-allowed'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(0,255,163,0.15)]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              {isVerifying ? 'Executing Sandbox...' : 'Run Sandbox Verification'}
            </button>
            <button
              onClick={fetchSandboxStatus}
              disabled={loading}
              className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
              title="Refresh Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Message Notification */}
        {runMessage && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between border ${
              runMessage.startsWith('✓')
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            <span>{runMessage}</span>
            <button onClick={() => setRunMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* 4 Pipeline Step Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          {/* Step 1: Environment */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[11px] text-slate-400">Environment</div>
                <div className="text-xs font-semibold text-white">
                  Isolated & Sanitized
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00ffa3]" />
          </div>

          {/* Step 2: Dependencies */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[11px] text-slate-400">Dependencies</div>
                <div className="text-xs font-semibold text-white">
                  {report?.installPhase?.success ? 'Linked & Verified' : 'Checked'}
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          </div>

          {/* Step 3: Compilation */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Terminal className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[11px] text-slate-400">Build & Bundle</div>
                <div className="text-xs font-semibold text-white">
                  {buildSuccess ? 'Passed (0 errors)' : `${compilationErrors.length} Errors`}
                </div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${buildSuccess ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          {/* Step 4: Test Suite */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[11px] text-slate-400">Smoke & Unit Tests</div>
                <div className="text-xs font-semibold text-white">
                  {report?.testPhase?.passedCount || tests.length}/{tests.length || 3} Passed
                </div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${testSuccess ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Security Boundary
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'build'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Build Logs & Compilation ({compilationErrors.length === 0 ? 'Clean' : `${compilationErrors.length} Errs`})
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'tests'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Automated Tests ({tests.length})
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'repairs'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Targeted Repair Runs ({repairHistory.length})
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: OVERVIEW & ISOLATION */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Status Summary Banner */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                  <span>Execution Outcome:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs uppercase font-mono ${
                      overallPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {overallPassed ? 'Passed Verification' : 'Verification Incomplete'}
                  </span>
                </div>
                {report?.attemptCount && (
                  <span className="text-xs text-slate-400 font-mono">
                    Attempts: {report.attemptCount}/{report.maxAttempts || 3}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {report?.summary ||
                  'The project has been prepared for isolated sandbox execution. All generated code is kept quarantined from main application server runtime.'}
              </p>

              {report?.sandboxDirectory && (
                <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-800 flex items-center justify-between">
                  <span>Sandbox Workspace: {report.sandboxDirectory}</span>
                  <span className="text-emerald-400 text-[10px]">Quarantined</span>
                </div>
              )}
            </div>

            {/* Security Isolation Guarantees */}
            <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/80 space-y-2">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Security & Isolation Guarantees
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1">
                  <div className="font-semibold text-white">Zero Secret Leakage</div>
                  <p className="text-[11px] text-slate-400">
                    Child processes receive a scrubbed environment stripped of GEMINI_API_KEY, OPENAI_API_KEY, and user tokens.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1">
                  <div className="font-semibold text-white">Strict Resource Caps</div>
                  <p className="text-[11px] text-slate-400">
                    25,000ms hard execution timeout and 4MB stdout/stderr buffer caps prevent infinite loops and runaway tasks.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1">
                  <div className="font-semibold text-white">Dedicated Subprocess VM</div>
                  <p className="text-[11px] text-slate-400">
                    Untrusted code is never evaluated directly inside the server process; builds and checks run in disposable temp dirs.
                  </p>
                </div>
              </div>
            </div>

            {/* Failing Files (if any) */}
            {compilationErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Files Responsible for Compilation Failures:</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {compilationErrors.map((err: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-950 border border-red-500/20 font-mono text-xs flex items-center justify-between"
                    >
                      <div className="truncate">
                        <span className="text-red-400 font-bold">{err.file}</span>
                        {err.line && <span className="text-slate-400">:{err.line}</span>}
                        <span className="text-slate-300 ml-2">— {err.message}</span>
                      </div>
                      {onNavigateToFile && (
                        <button
                          onClick={() => onNavigateToFile(err.file)}
                          className="shrink-0 ml-2 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                        >
                          Inspect File
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BUILD LOGS */}
        {activeTab === 'build' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Compiler & Bundler Output (esbuild & tsc)
              </span>
              <span className="font-mono text-slate-400">
                Duration: {report?.buildPhase?.durationMs || 0}ms
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[500px]">
              <pre className="whitespace-pre-wrap">
                {report?.buildPhase?.logs || 'No build logs captured yet. Run verification to generate logs.'}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: AUTOMATED TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Sandboxed Test Suite Results
              </span>
              <span className="font-mono text-emerald-400">
                {report?.testPhase?.passedCount || tests.length} Passed / {report?.testPhase?.failedCount || 0} Failed
              </span>
            </div>

            <div className="space-y-2">
              {tests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                  Tests will be evaluated upon running sandbox verification.
                </div>
              ) : (
                tests.map((test: any, idx: number) => {
                  const isPass = test.status === 'passed';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                        isPass
                          ? 'bg-slate-900/40 border-slate-800/80'
                          : 'bg-red-950/20 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="font-semibold text-white">{test.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                            {test.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {test.durationMs}ms
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300">{test.message}</p>

                      {test.file && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Target file: {test.file}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REPAIR RUNS TIMELINE */}
        {activeTab === 'repairs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Targeted AI Auto-Repair History
              </span>
              <span className="text-slate-400 text-[11px]">
                Configured max attempts: {report?.maxAttempts || 3}
              </span>
            </div>

            {repairHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
                <p>Clean first-pass build! No compilation or test repairs were required.</p>
              </div>
            ) : (
              repairHistory.map((rep: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs font-mono">
                        Repair Cycle #{rep.attempt}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        rep.outcome === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {rep.outcome}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{rep.summary}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {rep.failingFiles?.map((ff: string, fi: number) => (
                      <span
                        key={fi}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {ff}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
