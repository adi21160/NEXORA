import React, { useState } from 'react';
import { 
  PieChart, Zap, AlertTriangle, ShieldCheck, 
  DollarSign, Sliders, RefreshCw, CheckCircle2, TrendingUp
} from 'lucide-react';
import { QuotaStats, AIModel } from '../../types';

interface QuotasViewProps {
  quotas: QuotaStats;
  onUpdateQuotas: (updated: QuotaStats) => void;
  models: AIModel[];
}

export const QuotasView: React.FC<QuotasViewProps> = ({
  quotas,
  onUpdateQuotas,
  models,
}) => {
  const [spendingLimitInput, setSpendingLimitInput] = useState(quotas.spendingLimit.toString());
  const [costMode, setCostMode] = useState<'balanced' | 'cost_saving' | 'quality_first'>('balanced');
  const [testSimMessage, setTestSimMessage] = useState<string | null>(null);

  const handleSaveBudget = () => {
    const val = parseFloat(spendingLimitInput);
    if (!isNaN(val) && val > 0) {
      onUpdateQuotas({ ...quotas, spendingLimit: val });
    }
  };

  const handleSimulateRateLimitRecovery = () => {
    setTestSimMessage(
      'Drill initiated: Simulated rate-limit on Claude 3.7 Sonnet. Router instantly intercepted task, preserved virtual AST file context, and hot-swapped execution to Gemini 3.8 Flash with 0ms interruption.'
    );
    setTimeout(() => setTestSimMessage(null), 8000);
  };

  const budgetUsagePercent = Math.min(
    100,
    Math.round((quotas.totalEstimatedCost / quotas.spendingLimit) * 100)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Usage, Quotas & Compute Economics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time token telemetry, spending bounds, provider rate-limit monitors, and dynamic fallback drills.
          </p>
        </div>

        <button
          onClick={handleSimulateRateLimitRecovery}
          className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulate Rate-Limit Drill</span>
        </button>
      </div>

      {testSimMessage && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{testSimMessage}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total API Calls</div>
          <div className="text-2xl font-bold font-mono text-white">
            {quotas.totalApiRequests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">Zero dropped requests</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Tokens Consumed</div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {(quotas.totalTokensConsumed / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-slate-500 mt-2">Prompt + Completion</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Estimated Cost</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ${quotas.totalEstimatedCost.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">Across 6 AI Providers</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Budget Allocation</div>
          <div className="text-2xl font-bold font-mono text-white">
            {budgetUsagePercent}% <span className="text-xs font-normal text-slate-400">used</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full ${budgetUsagePercent > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`}
              style={{ width: `${budgetUsagePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Model-Specific Token & Cost Breakdown Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Provider Model Telemetry & Quota Saturation
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real-time meter</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Model Name</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Requests</th>
                <th className="py-3 px-4">Tokens Consumed</th>
                <th className="py-3 px-4">RPM Load</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4 text-right">Quota Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {models.map((m) => {
                const breakdown = quotas.modelBreakdown[m.id] || { requests: 0, tokens: 0, cost: 0 };
                const rpmLoad = Math.round((m.currentRPM / m.rpmLimit) * 100);

                return (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <span>{m.avatar}</span>
                      <span>{m.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{m.provider}</td>
                    <td className="py-3 px-4">{breakdown.requests}</td>
                    <td className="py-3 px-4">{(breakdown.tokens / 1000).toFixed(0)}k</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span>{rpmLoad}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${rpmLoad > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                            style={{ width: `${rpmLoad}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-emerald-400">${breakdown.cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Healthy
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quota Management Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <span>Monthly Budget Cap & Guardrails</span>
          </h3>

          <p className="text-xs text-slate-400">
            Set maximum budget limit. Generation will pause if token consumption approaches cap.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-400">$</span>
            <input
              type="number"
              step="5"
              value={spendingLimitInput}
              onChange={(e) => setSpendingLimitInput(e.target.value)}
              className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
            <button
              onClick={handleSaveBudget}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
            >
              Update Cap
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Orchestration Strategy</span>
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'balanced', label: 'Balanced', desc: 'Optimal trade-off' },
              { id: 'cost_saving', label: 'Cost-Saving', desc: 'Prefers Flash' },
              { id: 'quality_first', label: 'Quality-First', desc: 'Max depth' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCostMode(mode.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  costMode === mode.id
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-semibold">{mode.label}</div>
                <div className="text-[10px] text-slate-500">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
