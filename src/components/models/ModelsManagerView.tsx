import React, { useState, useEffect } from 'react';
import { 
  Cpu, CheckCircle2, AlertTriangle, ShieldCheck, 
  ArrowUp, ArrowDown, Key, Sliders, ExternalLink, 
  RefreshCw, Power, Zap, Lock, Info, Check, HelpCircle,
  Eye, EyeOff, Trash2, Unlink, Link2, XCircle
} from 'lucide-react';
import { AIModel, AIModelId, TaskCategory } from '../../types';

interface ModelsManagerViewProps {
  models: AIModel[];
  onUpdateModels: (updated: AIModel[]) => void;
}

interface ServerProviderStatus {
  id: 'gemini' | 'openai';
  name: string;
  hasCredentials: boolean;
  configuredEnvVar: string;
  maskedKey?: string;
  lastValidatedAt?: number;
  models: {
    id: string;
    name: string;
    contextWindow: string;
    costPer1kPrompt: number;
    costPer1kCompletion: number;
  }[];
  rateLimit: {
    isLimited: boolean;
    retryAfterSeconds?: number;
    lastError?: string;
    updatedAt: number;
  };
  totalTokensConsumed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  totalRequests: number;
  lastUsedTimestamp?: number;
}

export const ModelsManagerView: React.FC<ModelsManagerViewProps> = ({
  models,
  onUpdateModels,
}) => {
  const [serverProviders, setServerProviders] = useState<ServerProviderStatus[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // OpenAI dedicated card state
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isConnectingOpenai, setIsConnectingOpenai] = useState(false);
  const [isTestingOpenai, setIsTestingOpenai] = useState(false);
  const [isDisconnectingOpenai, setIsDisconnectingOpenai] = useState(false);
  const [openaiFeedback, setOpenaiFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Key configuration modal state (for Gemini or general)
  const [selectedProviderId, setSelectedProviderId] = useState<'gemini' | 'openai' | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Fetch live server provider statuses
  const fetchProviderStatuses = async () => {
    try {
      setIsLoadingProviders(true);
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        if (data.providers) {
          setServerProviders(data.providers);

          // Update models' status in parent state based on real backend credentials
          const geminiStatus = data.providers.find((p: any) => p.id === 'gemini');
          const openaiStatus = data.providers.find((p: any) => p.id === 'openai');

          const updatedModels = models.map((m) => {
            if (m.provider === 'Google') {
              return {
                ...m,
                status: geminiStatus?.hasCredentials ? ('connected' as const) : ('needs_key' as const),
              };
            }
            if (m.provider === 'OpenAI') {
              return {
                ...m,
                status: openaiStatus?.hasCredentials ? ('connected' as const) : ('needs_key' as const),
              };
            }
            return m;
          });

          onUpdateModels(updatedModels);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch provider status:', err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    fetchProviderStatuses();
  }, []);

  // Connect OpenAI API Key
  const handleConnectOpenAI = async () => {
    if (!openaiKeyInput.trim()) {
      setOpenaiFeedback({
        type: 'error',
        message: 'Invalid OpenAI API key. Please check your key and try again.',
      });
      return;
    }

    setIsConnectingOpenai(true);
    setOpenaiFeedback(null);

    try {
      const response = await fetch('/api/providers/openai/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openaiKeyInput.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setOpenaiKeyInput('');
        setOpenaiFeedback({
          type: 'success',
          message: '✓ OpenAI connection working',
        });
        await fetchProviderStatuses();
      } else {
        const errMsg = data.error || 'Invalid OpenAI API key. Please check your key and try again.';
        setOpenaiFeedback({
          type: 'error',
          message: errMsg,
        });
      }
    } catch (err: any) {
      setOpenaiFeedback({
        type: 'error',
        message: 'Unable to connect to OpenAI. Please try again later.',
      });
    } finally {
      setIsConnectingOpenai(false);
    }
  };

  // Test OpenAI Connection
  const handleTestOpenAI = async () => {
    setIsTestingOpenai(true);
    setOpenaiFeedback(null);

    try {
      const body = openaiKeyInput.trim() ? { apiKey: openaiKeyInput.trim() } : {};
      const response = await fetch('/api/providers/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOpenaiFeedback({
          type: 'success',
          message: data.message || '✓ OpenAI connection working',
        });
      } else {
        setOpenaiFeedback({
          type: 'error',
          message: data.message || '✕ OpenAI connection failed',
        });
      }
    } catch (err: any) {
      setOpenaiFeedback({
        type: 'error',
        message: '✕ OpenAI connection failed',
      });
    } finally {
      setIsTestingOpenai(false);
    }
  };

  // Disconnect OpenAI
  const handleDisconnectOpenAI = async () => {
    setIsDisconnectingOpenai(true);
    setOpenaiFeedback(null);

    try {
      const response = await fetch('/api/providers/openai/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setOpenaiKeyInput('');
        setOpenaiFeedback({
          type: 'info',
          message: 'OpenAI disconnected. Stored credentials removed from vault.',
        });
        await fetchProviderStatuses();
      } else {
        setOpenaiFeedback({
          type: 'error',
          message: 'Failed to disconnect OpenAI.',
        });
      }
    } catch (err: any) {
      setOpenaiFeedback({
        type: 'error',
        message: 'Failed to disconnect OpenAI.',
      });
    } finally {
      setIsDisconnectingOpenai(false);
    }
  };

  // Toggle model enable/disable
  const handleToggleEnable = (id: AIModelId) => {
    const updated = models.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateModels(updated);
  };

  // Adjust fallback priority
  const handleMovePriority = (id: AIModelId, direction: 'up' | 'down') => {
    const index = models.findIndex((m) => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === models.length - 1) return;

    const newModels = [...models];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newModels[index];
    newModels[index] = newModels[targetIndex];
    newModels[targetIndex] = temp;

    newModels.forEach((m, idx) => {
      m.priority = idx + 1;
    });

    onUpdateModels(newModels);
  };

  // Open Key Configuration Modal
  const handleOpenProviderConfig = (providerId: 'gemini' | 'openai') => {
    setSelectedProviderId(providerId);
    setApiKeyInput('');
    setTestResult(null);
  };

  // Save and probe API key via backend
  const handleSaveAndTestKey = async () => {
    if (!selectedProviderId) return;

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const endpoint = selectedProviderId === 'openai' ? '/api/providers/openai/connect' : '/api/providers/configure';
      const body = selectedProviderId === 'openai' 
        ? { apiKey: apiKeyInput }
        : { providerId: selectedProviderId, apiKey: apiKeyInput };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.connected)) {
        setTestResult({
          success: true,
          message: `Verified! Connection to ${selectedProviderId.toUpperCase()} succeeded.`,
          latencyMs: data.latencyMs,
        });

        // Refresh providers status
        await fetchProviderStatuses();
      } else {
        setTestResult({
          success: false,
          message: data.error || (selectedProviderId === 'openai' ? 'Invalid OpenAI API key. Please check your key and try again.' : 'Failed to update provider configuration.'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error while configuring provider.',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const geminiServer = serverProviders.find((p) => p.id === 'gemini');
  const openaiServer = serverProviders.find((p) => p.id === 'openai');
  const isOpenaiConnected = Boolean(openaiServer?.hasCredentials);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">AI Provider Connections & Model Router</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise server-side provider connections with AES-256 encryption at rest, live key probes, and automated fallback routing.
          </p>
        </div>

        <button
          onClick={fetchProviderStatuses}
          disabled={isLoadingProviders}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProviders ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Real AI Provider Adapters Live Status Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Integrated AI Providers</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OpenAI Provider Card */}
          <div className="p-5 md:p-6 rounded-2xl border border-slate-800 bg-[#0c101a] flex flex-col justify-between space-y-5 shadow-lg relative overflow-hidden">
            {/* Subtle glow border */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isOpenaiConnected ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />

            <div className="space-y-4">
              {/* Card Header: Brand + Connection Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-950/40">
                    🔮
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">OpenAI</h3>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <span>Server Provider Service: OpenAIProvider</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
                      isOpenaiConnected
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-950'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOpenaiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{isOpenaiConnected ? 'Connected' : 'Not Connected'}</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Powers complex system architecture, backend authentication, and deep domain modeling with automatic fallback to Gemini/Claude when unavailable.
              </p>

              {/* Secure API Key Connection Area */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
                {isOpenaiConnected ? (
                  // Connected State Display
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/90 px-3.5 py-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-400">API Key:</span>
                        <span className="text-emerald-300 font-semibold tracking-wider">
                          {openaiServer?.maskedKey || '••••••••••••ABCD'}
                        </span>
                      </div>

                      {openaiServer?.lastValidatedAt && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Validated {new Date(openaiServer.lastValidatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={handleTestOpenAI}
                        disabled={isTestingOpenai || isDisconnectingOpenai}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingOpenai ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                        <span>Test Connection</span>
                      </button>

                      <button
                        onClick={handleDisconnectOpenAI}
                        disabled={isDisconnectingOpenai || isTestingOpenai}
                        className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Not Connected State: Secure Input & Actions
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        OpenAI API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showOpenaiKey ? 'text' : 'password'}
                          value={openaiKeyInput}
                          onChange={(e) => setOpenaiKeyInput(e.target.value)}
                          placeholder="sk-proj-..."
                          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                          title={showOpenaiKey ? 'Hide API Key' : 'Show API Key'}
                        >
                          {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={handleConnectOpenAI}
                        disabled={isConnectingOpenai || !openaiKeyInput.trim()}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
                      >
                        {isConnectingOpenai ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        <span>Connect OpenAI</span>
                      </button>

                      <button
                        onClick={handleTestOpenAI}
                        disabled={isTestingOpenai || !openaiKeyInput.trim()}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingOpenai ? 'animate-spin' : ''}`} />
                        <span>Test Connection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback status banner */}
                {openaiFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                      openaiFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : openaiFeedback.type === 'error'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {openaiFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : openaiFeedback.type === 'error' ? (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium leading-relaxed">{openaiFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Telemetry metadata */}
              <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Available Models:</span>
                  <span className="text-slate-200">gpt-4o (Omni), gpt-4o-mini</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens Consumed:</span>
                  <span className="text-slate-200">{openaiServer?.totalTokensConsumed.totalTokens.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Requests Processed:</span>
                  <span className="text-slate-200">{openaiServer?.totalRequests || 0}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Encrypted at rest (AES-256-GCM) • Server memory only</span>
              </div>
            </div>
          </div>

          {/* Google Gemini Card */}
          <div className="p-5 md:p-6 rounded-2xl border border-slate-800 bg-[#0c101a] flex flex-col justify-between space-y-5 shadow-lg relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${geminiServer?.hasCredentials ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-800'}`} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-blue-950/40">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Google Gemini</h3>
                    <div className="text-[11px] text-slate-400 font-mono">SDK: @google/genai v2.4.0</div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold flex items-center gap-1.5 ${
                    geminiServer?.hasCredentials
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${geminiServer?.hasCredentials ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{geminiServer?.hasCredentials ? 'Connected' : 'Missing Key'}</span>
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Powers high-speed scaffolding, interactive state orchestration, and real-time auto-repairs with 1M+ token context windows.
              </p>

              <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between">
                  <span>Env Variable:</span>
                  <span className="text-cyan-400">GEMINI_API_KEY</span>
                </div>
                <div className="flex justify-between">
                  <span>Models:</span>
                  <span className="text-slate-200">gemini-3.8-flash, gemini-3.1-pro</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens Consumed:</span>
                  <span className="text-slate-200">{geminiServer?.totalTokensConsumed.totalTokens.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Requests:</span>
                  <span className="text-slate-200">{geminiServer?.totalRequests || 0}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
              {!geminiServer?.hasCredentials ? (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Set GEMINI_API_KEY in environment</span>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Ready for planner & coding tasks</span>
                </div>
              )}

              <button
                onClick={() => handleOpenProviderConfig('gemini')}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure Key</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Model Registry List with Priority Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Router Priority & Model Registry</span>
          </h2>
          <span className="text-xs text-slate-400">Use arrows to adjust fallback order</span>
        </div>

        <div className="space-y-3">
          {models.map((model, idx) => {
            const isGoogleOrOpenAI = model.provider === 'Google' || model.provider === 'OpenAI';
            const isConnected = model.status === 'connected';

            return (
              <div
                key={model.id}
                className={`p-4 rounded-xl border transition-all ${
                  model.enabled
                    ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Identity & Priority */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleMovePriority(model.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 disabled:opacity-20"
                        title="Increase Priority"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono font-bold text-slate-400">#{model.priority}</span>
                      <button
                        onClick={() => handleMovePriority(model.id, 'down')}
                        disabled={idx === models.length - 1}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 disabled:opacity-20"
                        title="Decrease Priority"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{model.avatar}</span>
                        <h3 className="text-sm font-bold text-white">{model.name}</h3>
                        <span className="text-xs font-mono text-slate-400">({model.provider})</span>

                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.2 rounded-full font-semibold ${
                            isConnected
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : model.status === 'ready'
                              ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isConnected ? '● Connected' : model.status === 'ready' ? '● Ready' : '✕ Needs Key'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 max-w-xl">{model.specialty}</p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {model.supportedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Stats & Controls */}
                  <div className="flex items-center gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">Context / Latency</div>
                      <div className="text-xs font-mono text-slate-200">
                        {model.contextWindow.split(' ')[0]} • ~{model.latencyMs}ms
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGoogleOrOpenAI && (
                        <button
                          onClick={() => handleOpenProviderConfig(model.provider === 'Google' ? 'gemini' : 'openai')}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          title={`Configure ${model.provider} API Key`}
                        >
                          <Key className="w-4 h-4 text-cyan-400" />
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleEnable(model.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          model.enabled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                        title={model.enabled ? 'Enabled' : 'Disabled'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider API Key Configuration Modal (Fallback / Direct Probe) */}
      {selectedProviderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedProviderId === 'gemini' ? '⚡' : '🔮'}</span>
                <h3 className="text-sm font-bold text-white">
                  Configure {selectedProviderId === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProviderId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedProviderId === 'gemini' ? (
                <>
                  Google Gemini keys can be configured in your environment as <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">GEMINI_API_KEY</code>, or entered here for the running server.
                </>
              ) : (
                <>
                  OpenAI keys are encrypted at rest with AES-256-GCM. The plaintext key is never sent to the browser.
                </>
              )}
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                {selectedProviderId === 'gemini' ? 'Google AI Studio API Key' : 'OpenAI API Key'}
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={selectedProviderId === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Encrypted server-side only. Never exposed in browser code.</span>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.success ? 'Verification Passed' : 'Verification Issue'}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{testResult.message}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedProviderId(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleSaveAndTestKey}
                disabled={isTestingKey || !apiKeyInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {isTestingKey && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Test Probe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
