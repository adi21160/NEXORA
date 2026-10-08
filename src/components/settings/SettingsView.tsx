import React, { useState } from 'react';
import { Settings, Shield, Sliders, Cpu, Save, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [defaultSpeed, setDefaultSpeed] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [autoTesting, setAutoTesting] = useState(true);
  const [autoRepair, setAutoRepair] = useState(true);
  const [telemetryOptIn, setTelemetryOptIn] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">Platform & Router Settings</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure default code generation rules, self-healing parameters, and router fallback preferences.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Platform settings updated successfully.</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Router Execution Rules */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Router Optimization Profile</span>
          </h3>

          <div>
            <label className="block text-xs text-slate-300 mb-2">Default Generation Profile</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'fast', label: 'High Speed', desc: 'Scaffolding priority with Gemini 3.8 Flash' },
                { id: 'balanced', label: 'Balanced', desc: 'Harmonized multi-model distribution' },
                { id: 'quality', label: 'Maximum Polish', desc: 'DeepSeek R1 + Claude 3.7 deep reasoning' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDefaultSpeed(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    defaultSpeed === opt.id
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quality & Self-Healing Guardrails */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Automated QA & Self-Healing</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Automated Multi-Phase Testing
                </div>
                <div className="text-[11px] text-slate-400">
                  Execute syntax, type check, OWASP security, and accessibility checks on completion.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoTesting}
                onChange={(e) => setAutoTesting(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Autonomous Self-Healing Auto-Repair
                </div>
                <div className="text-[11px] text-slate-400">
                  Automatically engage AI debugging specialist when syntax or build errors are detected.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoRepair}
                onChange={(e) => setAutoRepair(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
