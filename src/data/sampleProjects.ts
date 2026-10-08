import { Project } from '../types';

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj-cloudpulse-01',
    name: 'CloudPulse - Multi-Cloud Observability Dashboard',
    description: 'Real-time telemetry, server health metrics, latency heatmaps, incident management, and cluster status.',
    type: 'Dashboard',
    stack: 'React 19, Tailwind CSS, Lucide Icons, TypeScript',
    design: 'Enterprise Dark Glassmorphism with deep navy tones and neon status accents',
    functionalRequirements: 'Interactive telemetry filters, live metric stream simulation, cluster node status toggles, incident response modal, export to CSV.',
    backendRequirements: 'Mock WebSocket telemetry emitter, REST service endpoints for incident logs.',
    authRequirements: 'RBAC with Admin, DevOps Engineer, and Viewer role badges.',
    status: 'completed',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 1800000,
    version: 1,
    activeFile: 'src/App.tsx',
    settings: {
      generationSpeed: 'balanced',
      costOptimization: false,
      maxRetries: 3,
      autoRepair: true,
      budgetCap: 5.0,
      preferredModels: {
        architecture: 'gpt-4o',
        'ui-design': 'claude-3-7-sonnet',
        frontend: 'claude-3-7-sonnet',
        backend: 'deepseek-r1',
        testing: 'llama-3-3-70b',
        security: 'gemini-3-1-pro',
      },
    },
    stats: {
      totalTokens: 18420,
      estimatedCost: 0.042,
      elapsedSeconds: 28,
      modelsUsed: ['gpt-4o', 'claude-3-7-sonnet', 'gemini-3.8-flash', 'deepseek-r1', 'gemini-3-1-pro', 'llama-3-3-70b'],
    },
    tasks: [
      {
        id: 't-1',
        title: 'System Architecture & Telemetry Spec',
        category: 'architecture',
        description: 'Define telemetry data models, metric streaming interfaces, incident state machine, and component topology.',
        assignedModel: 'gpt-4o',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: [],
        targetFiles: ['src/types/telemetry.ts', 'README.md'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Analyzed observability requirements', 'Defined NodeHealth, MetricPoint, and Incident interfaces', 'Established 500ms ticker cycle'],
        startTime: Date.now() - 3600000 * 5,
        completedTime: Date.now() - 3600000 * 5 + 3200,
        tokenUsage: { promptTokens: 620, completionTokens: 1100, totalTokens: 1720 },
        executedByModel: 'gpt-4o',
      },
      {
        id: 't-2',
        title: 'Design System & Dark Glassmorphism Shell',
        category: 'ui-design',
        description: 'Implement dark navy theme tokens, status badge glow classes, and layout scaffolding.',
        assignedModel: 'claude-3-7-sonnet',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-1'],
        targetFiles: ['src/index.css', 'src/components/Navbar.tsx'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Generated palette with slate-950 base and cyan-400 glow', 'Constructed responsive header with status indicator'],
        startTime: Date.now() - 3600000 * 5 + 3400,
        completedTime: Date.now() - 3600000 * 5 + 7100,
        tokenUsage: { promptTokens: 750, completionTokens: 1450, totalTokens: 2200 },
        executedByModel: 'claude-3-7-sonnet',
      },
      {
        id: 't-3',
        title: 'Telemetry Store & Mock Generator',
        category: 'backend',
        description: 'Build persistent telemetry store with dynamic sinusoidal wave generator and random incident generator.',
        assignedModel: 'deepseek-r1',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-1'],
        targetFiles: ['src/services/telemetryService.ts'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Built CPU/Memory/Disk metrics formula', 'Added cluster nodes: us-east-1, eu-west-1, ap-southeast-1', 'Added incident resolution transitions'],
        startTime: Date.now() - 3600000 * 5 + 3500,
        completedTime: Date.now() - 3600000 * 5 + 8200,
        tokenUsage: { promptTokens: 890, completionTokens: 1620, totalTokens: 2510 },
        executedByModel: 'deepseek-r1',
      },
      {
        id: 't-4',
        title: 'Interactive Metrics Grid & Live Charts',
        category: 'frontend',
        description: 'Construct real-time SVG sparkline charts, KPI cards, and region selector tabs.',
        assignedModel: 'claude-3-7-sonnet',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-2', 't-3'],
        targetFiles: ['src/components/MetricsOverview.tsx', 'src/components/SparklineChart.tsx'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Implemented SVG smooth cubic bezier path renderer', 'Added live pulse dot with CSS ping animation'],
        startTime: Date.now() - 3600000 * 5 + 8500,
        completedTime: Date.now() - 3600000 * 5 + 13400,
        tokenUsage: { promptTokens: 1120, completionTokens: 2100, totalTokens: 3220 },
        executedByModel: 'claude-3-7-sonnet',
      },
      {
        id: 't-5',
        title: 'Cluster Nodes Table & Incident Management Modal',
        category: 'frontend',
        description: 'Implement node health table, restart node action, filter bar, and incident resolution dialog.',
        assignedModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-4'],
        targetFiles: ['src/components/NodesTable.tsx', 'src/components/IncidentModal.tsx'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Created searchable nodes list with memory/CPU bars', 'Added interactive restart simulation with toast notification'],
        startTime: Date.now() - 3600000 * 5 + 13800,
        completedTime: Date.now() - 3600000 * 5 + 18900,
        tokenUsage: { promptTokens: 980, completionTokens: 1840, totalTokens: 2820 },
        executedByModel: 'gemini-3.8-flash',
      },
      {
        id: 't-6',
        title: 'Code Integration & State Binding',
        category: 'frontend',
        description: 'Unify components in App.tsx, synchronize interval timer, and handle export to CSV/JSON.',
        assignedModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-5'],
        targetFiles: ['src/App.tsx'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Integrated all telemetry views into clean master container', 'Harmonized import paths and state props', 'Added CSV export function'],
        startTime: Date.now() - 3600000 * 5 + 19200,
        completedTime: Date.now() - 3600000 * 5 + 23500,
        tokenUsage: { promptTokens: 1250, completionTokens: 2400, totalTokens: 3650 },
        executedByModel: 'gemini-3.8-flash',
      },
      {
        id: 't-7',
        title: 'Automated Unit Tests & Contract Validation',
        category: 'testing',
        description: 'Run automated assertions for node health computations and metrics time-window slicing.',
        assignedModel: 'llama-3-3-70b',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-6'],
        targetFiles: ['src/tests/telemetry.test.ts'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Passed: 6/6 test assertions', 'Validated CPU threshold warning triggers', 'Verified node restart state transition'],
        startTime: Date.now() - 3600000 * 5 + 23800,
        completedTime: Date.now() - 3600000 * 5 + 25800,
        tokenUsage: { promptTokens: 450, completionTokens: 680, totalTokens: 1130 },
        executedByModel: 'llama-3-3-70b',
      },
      {
        id: 't-8',
        title: 'Security Audit & Vulnerability Check',
        category: 'security',
        description: 'Scan code for dangerouslySetInnerHTML, open script vectors, and sanitized CSV download headers.',
        assignedModel: 'gemini-3-1-pro',
        fallbackModel: 'gemini-3.8-flash',
        status: 'completed',
        dependencies: ['t-6'],
        targetFiles: ['src/security/audit.json'],
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        logs: ['Zero XSS vulnerabilities detected', 'CSV escape characters applied for formula injection mitigation', 'Content Security Policy recommendations generated'],
        startTime: Date.now() - 3600000 * 5 + 26000,
        completedTime: Date.now() - 3600000 * 5 + 28000,
        tokenUsage: { promptTokens: 410, completionTokens: 760, totalTokens: 1170 },
        executedByModel: 'gemini-3-1-pro',
      },
    ],
    testResults: [
      {
        id: 'tc-1',
        category: 'syntax',
        name: 'TypeScript & JSX Syntax Check',
        status: 'passed',
        message: 'No syntax or parsing errors found across 8 files.',
        autoRepairable: true,
      },
      {
        id: 'tc-2',
        category: 'typecheck',
        name: 'Type Contract & Interface Alignment',
        status: 'passed',
        message: 'TelemetryNode and Incident interfaces strictly satisfied.',
        autoRepairable: true,
      },
      {
        id: 'tc-3',
        category: 'contract',
        name: 'API Mock Data Integrity',
        status: 'passed',
        message: 'All simulated WebSocket tick payloads match schema.',
        autoRepairable: false,
      },
      {
        id: 'tc-4',
        category: 'security',
        name: 'OWASP Sanitization & CSP Check',
        status: 'passed',
        message: 'No unsafe DOM sinks or raw innerHTML detected.',
        autoRepairable: true,
      },
      {
        id: 'tc-5',
        category: 'accessibility',
        name: 'WCAG 2.2 Contrast & Aria Labels',
        status: 'passed',
        message: 'Contrast ratio >= 4.5:1 across all metric cards.',
        autoRepairable: true,
      },
      {
        id: 'tc-6',
        category: 'build',
        name: 'Vite Production Build Verification',
        status: 'passed',
        message: 'Bundle compiled successfully (142 KB gzipped).',
        autoRepairable: false,
      },
    ],
    files: {
      'src/App.tsx': {
        path: 'src/App.tsx',
        language: 'typescript',
        lastModified: Date.now() - 1800000,
        createdByTask: 't-6',
        version: 1,
        content: `import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, AlertTriangle, ShieldCheck, Download, 
  RefreshCw, Play, Pause, Cpu, HardDrive, Wifi, Bell, 
  CheckCircle2, ChevronRight, Layers, ArrowUpRight, BarChart3
} from 'lucide-react';

interface MetricNode {
  id: string;
  name: string;
  region: string;
  status: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  latency: number;
  uptime: string;
  requestsPerSec: number;
}

const INITIAL_NODES: MetricNode[] = [
  { id: 'node-01', name: 'api-gateway-us-east', region: 'us-east-1', status: 'healthy', cpu: 34, memory: 58, latency: 28, uptime: '99.98%', requestsPerSec: 1420 },
  { id: 'node-02', name: 'auth-service-us-east', region: 'us-east-1', status: 'healthy', cpu: 22, memory: 44, latency: 19, uptime: '99.99%', requestsPerSec: 890 },
  { id: 'node-03', name: 'billing-engine-eu-central', region: 'eu-central-1', status: 'warning', cpu: 78, memory: 82, latency: 94, uptime: '99.82%', requestsPerSec: 430 },
  { id: 'node-04', name: 'analytics-worker-ap-se', region: 'ap-southeast-1', status: 'healthy', cpu: 45, memory: 61, latency: 42, uptime: '99.95%', requestsPerSec: 1100 },
  { id: 'node-05', name: 'vector-db-cluster-01', region: 'us-east-1', status: 'healthy', cpu: 62, memory: 71, latency: 31, uptime: '99.91%', requestsPerSec: 2300 },
];

export default function CloudPulseApp() {
  const [nodes, setNodes] = useState<MetricNode[]>(INITIAL_NODES);
  const [isLive, setIsLive] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'incidents'>('overview');
  const [ticker, setTicker] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live simulation tick
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setTicker(t => t + 1);
      setNodes(prev => prev.map(node => {
        const deltaCpu = (Math.random() - 0.48) * 4;
        const newCpu = Math.min(95, Math.max(15, Math.round(node.cpu + deltaCpu)));
        const newLatency = Math.min(180, Math.max(12, Math.round(node.latency + (Math.random() - 0.5) * 6)));
        const status = newCpu > 85 ? 'critical' : newCpu > 70 ? 'warning' : 'healthy';
        return {
          ...node,
          cpu: newCpu,
          latency: newLatency,
          status,
          requestsPerSec: Math.round(node.requestsPerSec + (Math.random() - 0.5) * 50)
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRestartNode = (id: string, name: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, cpu: 18, latency: 22, status: 'healthy' } : n));
    showToast(\`Initiated graceful restart for \${name}\`);
  };

  const filteredNodes = selectedRegion === 'all' 
    ? nodes 
    : nodes.filter(n => n.region === selectedRegion);

  const avgCpu = Math.round(nodes.reduce((acc, n) => acc + n.cpu, 0) / nodes.length);
  const avgLatency = Math.round(nodes.reduce((acc, n) => acc + n.latency, 0) / nodes.length);
  const totalRps = nodes.reduce((acc, n) => acc + n.requestsPerSec, 0);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">CloudPulse</h1>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">v2.4 Enterprise</span>
            </div>
            <p className="text-xs text-slate-400">Global Cluster Telemetry & Autonomous Healing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 font-mono">
            <span className={\`w-2 h-2 rounded-full \${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}\`}></span>
            <span>{isLive ? 'STREAMING REAL-TIME' : 'STREAM PAUSED'}</span>
          </div>

          <button 
            onClick={() => setIsLive(!isLive)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60 text-xs flex items-center gap-1.5"
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'Pause' : 'Resume'}</span>
          </button>

          <button 
            onClick={() => showToast('Exported telemetry dataset to cloudpulse_metrics.json')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Snapshot</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Average Cluster CPU</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{avgCpu}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className={\`h-full transition-all duration-500 \${avgCpu > 70 ? 'bg-rose-500' : avgCpu > 50 ? 'bg-amber-500' : 'bg-cyan-500'}\`} 
                style={{ width: \`\${avgCpu}%\` }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>P99 Global Latency</span>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{avgLatency} ms</div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <span>● Under 50ms SLA baseline</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Aggregate Throughput</span>
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{(totalRps).toLocaleString()} rps</div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="text-emerald-400">+4.2%</span> vs last hour
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Node Fleet Status</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{nodes.filter(n => n.status === 'healthy').length}/{nodes.length} Up</div>
            <div className="text-[11px] text-slate-400 mt-2">
              <span>1 Node elevated load</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button 
              onClick={() => setActiveTab('overview')}
              className={\`px-3 py-1.5 rounded-md font-medium transition-all \${activeTab === 'overview' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}\`}
            >
              Cluster Overview
            </button>
            <button 
              onClick={() => setActiveTab('nodes')}
              className={\`px-3 py-1.5 rounded-md font-medium transition-all \${activeTab === 'nodes' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}\`}
            >
              Node Management ({nodes.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Region:</span>
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Regions (3)</option>
              <option value="us-east-1">us-east-1 (N. Virginia)</option>
              <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
              <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
            </select>
          </div>
        </div>

        {/* Active Node Fleet Table */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Production Nodes & Health Metrics</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Cycle #{ticker}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Node Name</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">CPU Utilization</th>
                  <th className="py-3 px-4">Memory</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Uptime</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredNodes.map(node => (
                  <tr key={node.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <div className={\`w-2 h-2 rounded-full \${node.status === 'healthy' ? 'bg-emerald-400' : node.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400 animate-ping'}\`}></div>
                      {node.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{node.region}</td>
                    <td className="py-3.5 px-4">
                      <span className={\`px-2 py-0.5 rounded-full text-[10px] uppercase font-sans font-semibold \${
                        node.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        node.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }\`}>
                        {node.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8">{node.cpu}%</span>
                        <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className={\`h-full \${node.cpu > 70 ? 'bg-amber-400' : 'bg-cyan-400'}\`} style={{ width: \`\${node.cpu}%\` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{node.memory}%</td>
                    <td className="py-3.5 px-4 text-cyan-300">{node.latency} ms</td>
                    <td className="py-3.5 px-4 text-slate-400">{node.uptime}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleRestartNode(node.id, node.name)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-sans transition-colors inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        Restart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-3 text-xs text-slate-500 flex items-center justify-between">
        <span>Generated by NexusAI Collaborative Multi-Model Engine (GPT-4o + Claude 3.7 + Gemini 3.8 + DeepSeek R1)</span>
        <span className="font-mono">Nexus Cluster ID: nx-90214-us-east</span>
      </footer>
    </div>
  );
}`,
      },
      'README.md': {
        path: 'README.md',
        language: 'markdown',
        lastModified: Date.now() - 1800000,
        createdByTask: 't-1',
        version: 1,
        content: `# CloudPulse - Multi-Cloud Observability Dashboard

Production-grade real-time infrastructure telemetry and observability dashboard built collaboratively with NexusAI Studio.

## Multi-AI Model Attribution
- **Architecture & System Spec**: OpenAI GPT-4o
- **UI Design System & Shell**: Anthropic Claude 3.7 Sonnet
- **State Store & Telemetry Generator**: DeepSeek R1 Reasoner
- **Component Views & Actions**: Google Gemini 3.8 Flash
- **Unit Test Suite**: Meta Llama 3.3 70B
- **Security Audit & Hardening**: Google Gemini 3.1 Pro

## Setup Instructions
\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.`,
      },
      'package.json': {
        path: 'package.json',
        language: 'json',
        lastModified: Date.now() - 1800000,
        createdByTask: 't-1',
        version: 1,
        content: JSON.stringify({
          name: 'cloudpulse-dashboard',
          version: '1.0.0',
          private: true,
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^0.546.0',
            tailwindcss: '^4.3.0',
          },
        }, null, 2),
      },
      'src/types/telemetry.ts': {
        path: 'src/types/telemetry.ts',
        language: 'typescript',
        lastModified: Date.now() - 1800000,
        createdByTask: 't-1',
        version: 1,
        content: `export interface MetricNode {
  id: string;
  name: string;
  region: string;
  status: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  latency: number;
  uptime: string;
  requestsPerSec: number;
}

export interface ClusterSummary {
  totalNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  avgCpu: number;
  avgLatency: number;
  totalRps: number;
}`,
      },
    },
  },
];
