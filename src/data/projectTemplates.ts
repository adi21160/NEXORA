export interface ProjectTemplate {
  id: string;
  name: string;
  tagline: string;
  type: 'Website' | 'Web App' | 'Dashboard' | 'SaaS Product' | 'E-commerce' | 'Portfolio' | 'Custom';
  description: string;
  stack: string;
  design: string;
  functionalRequirements: string;
  backendRequirements: string;
  authRequirements: string;
  badge: string;
  icon: string;
  color: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'template-saas-dashboard',
    name: 'CloudPulse - Multi-Cloud Observability Dashboard',
    tagline: 'Real-time telemetry, server health metrics, latency heatmaps, and incident management.',
    type: 'Dashboard',
    description: 'A production-grade cloud monitoring and infrastructure observability dashboard with live throughput charts, error budgets, cluster status, alert rules, and dark developer aesthetic.',
    stack: 'React 19, Tailwind CSS v4, Lucide Icons, Canvas Visualizer, TypeScript',
    design: 'Enterprise Dark Glassmorphism with deep navy tones and neon status accents',
    functionalRequirements: 'Interactive telemetry filters, time-range picker (1h, 24h, 7d), simulated live metrics stream, cluster node status toggles, incident response modal, export to CSV/JSON.',
    backendRequirements: 'Mock WebSocket telemetry emitter, REST service endpoints for incident logs and alerts.',
    authRequirements: 'RBAC with Admin, DevOps Engineer, and Viewer role badges.',
    badge: 'Trending',
    icon: 'Activity',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'template-ecommerce',
    name: 'PulseCommerce - Next-Gen Headless Storefront',
    tagline: 'Modern high-converting storefront with interactive cart, product visualizer, and checkout.',
    type: 'E-commerce',
    description: 'Sophisticated modern ecommerce store featuring category filtering, live cart slide-over with price calculations, discount code simulator, instant search, and product detail modal.',
    stack: 'React 19, Tailwind CSS v4, Zustand-style Store, Lucide Icons',
    design: 'Minimalist Luxury Dark with subtle gold/cyan borders and high-contrast typography',
    functionalRequirements: 'Facet filtering by category and price, real-time search, cart drawer with quantity counters, simulated multi-step checkout, coupon code validation.',
    backendRequirements: 'Catalog API mock with 12 items, stock inventory tracker, order receipt generator.',
    authRequirements: 'Guest checkout + Customer account profile with order history.',
    badge: 'Popular',
    icon: 'ShoppingBag',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'template-ai-workflow',
    name: 'OmniFlow - AI Agent Workflow & Automation Canvas',
    tagline: 'Visual drag-and-drop node graph builder for orchestrating autonomous AI agent pipelines.',
    type: 'SaaS Product',
    description: 'Interactive canvas for constructing multi-step AI reasoning graphs, connecting LLM prompts, tool execution nodes, conditionals, and real-time execution preview.',
    stack: 'React 19, SVG Interactive Graph Canvas, Tailwind CSS, Lucide Icons',
    design: 'Cyber-Modern High-Contrast Dark with glowing node connectors and neon pulse signals',
    functionalRequirements: 'Draggable node canvas, node inspector panel, test run simulator with token counter, pipeline export to JSON, preset workflow templates.',
    backendRequirements: 'Workflow orchestration engine mock, execution step logger.',
    authRequirements: 'Workspace team sharing with permission toggles.',
    badge: 'New',
    icon: 'GitFork',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'template-crypto-analytics',
    name: 'ApexTrade - Predictive Crypto & Asset Analytics',
    tagline: 'Institutional-grade asset terminal with candlestick charts, order books, and price alerts.',
    type: 'Web App',
    description: 'High-frequency market dashboard with interactive chart controls, live order book depth, portfolio PnL simulator, and technical indicator overlays (RSI, MACD).',
    stack: 'React 19, Tailwind CSS, HTML5 Canvas Charting, TypeScript',
    design: 'Terminal Obsidian Dark with bright green/red market indicators and monospace typography',
    functionalRequirements: 'Asset switcher (BTC, ETH, SOL), timeframe toggles, simulated live ticker updates, simulated order placement modal with slippage controls.',
    backendRequirements: 'Mock price tick generator, portfolio balance calculator.',
    authRequirements: '2FA simulated security shield and wallet connect simulation.',
    badge: 'Pro',
    icon: 'TrendingUp',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'template-dev-portal',
    name: 'NexusAPI - Interactive Developer API Hub & Documentation',
    tagline: 'Swagger/OpenAPI-style interactive API explorer with live curl generator and response sandbox.',
    type: 'Website',
    description: 'A developer portal featuring interactive endpoint testers, request parameter builders, response status code inspectors, code snippet generators in 5 languages, and API key management.',
    stack: 'React 19, Tailwind CSS, Syntax Highlighting, Lucide Icons',
    design: 'Clean Deep Slate with syntax-colored request badges and code blocks',
    functionalRequirements: 'Endpoint explorer, interactive "Send Request" tester with simulated 200/400/401 responses, copy curl button, language tabs (TypeScript, Python, cURL, Go).',
    backendRequirements: 'Mock OpenAPI spec parser and mock response generator.',
    authRequirements: 'API Token generation dialog with scope permissions.',
    badge: 'Essential',
    icon: 'Terminal',
    color: 'from-indigo-500 to-violet-500',
  },
];
