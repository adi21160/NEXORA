import { ProjectFile, ProjectTask } from '../types';

export interface IntegrationIssue {
  type: 'import_missing' | 'type_mismatch' | 'naming_conflict' | 'duplicate_export' | 'syntax_warning';
  file: string;
  message: string;
  severity: 'error' | 'warning';
  suggestedFix?: string;
}

export interface IntegrationReport {
  success: boolean;
  totalFiles: number;
  conflictsResolved: number;
  issues: IntegrationIssue[];
  bundleHtml: string;
}

export const CodeIntegrator = {
  /**
   * Harmonize code files from multiple AI models into a coherent virtual filesystem
   */
  integrateFiles(
    files: Record<string, ProjectFile>,
    tasks: ProjectTask[]
  ): IntegrationReport {
    const issues: IntegrationIssue[] = [];
    let conflictsResolved = 0;

    // 1. Verify existence of App entry point
    if (!files['src/App.tsx'] && !files['src/App.jsx'] && !files['App.tsx']) {
      issues.push({
        type: 'import_missing',
        file: 'src/App.tsx',
        message: 'No primary App component entry point found. Synthesizing default container.',
        severity: 'warning',
        suggestedFix: 'Auto-synthesizing src/App.tsx from task artifacts',
      });
      conflictsResolved++;
    }

    // 2. Scan for conflicting import paths or un-exported functions
    for (const [filePath, file] of Object.entries(files)) {
      const content = file.content;

      // Check for raw require() statements in ES Module code
      if (content.includes('require(') && !content.includes('// require')) {
        issues.push({
          type: 'import_missing',
          file: filePath,
          message: 'Found CommonJS require() statement in ES Module code.',
          severity: 'warning',
          suggestedFix: 'Convert to ES6 import statement',
        });
        conflictsResolved++;
      }

      // Check for export default in App
      if (filePath.endsWith('App.tsx') && !content.includes('export default')) {
        issues.push({
          type: 'duplicate_export',
          file: filePath,
          message: 'App component is missing default export.',
          severity: 'error',
          suggestedFix: 'Append export default App',
        });
      }
    }

    // 3. Build live interactive iframe bundle
    const bundleHtml = this.generateSandboxBundle(files);

    return {
      success: issues.filter((i) => i.severity === 'error').length === 0,
      totalFiles: Object.keys(files).length,
      conflictsResolved,
      issues,
      bundleHtml,
    };
  },

  /**
   * Generate an executable standalone HTML sandbox that renders the project live with React and Tailwind!
   */
  generateSandboxBundle(files: Record<string, ProjectFile>): string {
    const appFile = files['src/App.tsx'] || files['src/App.jsx'] || files['App.tsx'];
    let appCode = appFile ? appFile.content : `
      export default function App() {
        return (
          <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">NexusAI Sandbox Ready</h1>
              <p className="text-slate-400">Executing collaborative multi-model build...</p>
            </div>
          </div>
        );
      }
    `;

    // Strip export default and import statements for the Babel Standalone browser bundle
    // We convert imports of React, lucide-react to global window libraries
    const transformedCode = appCode
      .replace(/import\s+React.*?from\s+['"]react['"];?/g, '')
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'const { $1 } = React;')
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g, 'const { $1 } = window.lucideIcons || {};')
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
      .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'window.__AppEntry = $1;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusAI Live Preview</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f0f9ff',
              500: '#06b6d4',
              600: '#0891b2',
              900: '#0e172a'
            }
          }
        }
      }
    }
  </script>
  <!-- React & ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- Babel for live JSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #070b14;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    /* Custom scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Lucide icons polyfill for standalone iframe -->
  <script>
    // Provide lightweight SVG icons for common Lucide names used in projects
    const createSvg = (name, d) => (props) => {
      const size = props?.size || 18;
      const className = props?.className || 'w-4 h-4';
      return React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: className,
      }, React.createElement('path', { d: d }));
    };

    window.lucideIcons = new Proxy({}, {
      get: (target, prop) => {
        return (props) => {
          const className = props?.className || 'w-4 h-4';
          return React.createElement('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            width: 18,
            height: 18,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            className: className,
          }, React.createElement('circle', { cx: 12, cy: 12, r: 9 }));
        };
      }
    });
  </script>

  <!-- Live Application Script -->
  <script type="text/babel">
    try {
      ${transformedCode}

      // If window.__AppEntry not set, search for declared function
      const TargetComponent = window.__AppEntry || (typeof CloudPulseApp !== 'undefined' ? CloudPulseApp : (typeof App !== 'undefined' ? App : null));

      if (TargetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(TargetComponent));
      } else {
        document.getElementById('root').innerHTML = '<div style="padding:24px;color:#f87171">No main component found to render.</div>';
      }
    } catch (err) {
      console.error('Sandbox Render Error:', err);
      document.getElementById('root').innerHTML = '<div style="padding:24px;color:#f87171;font-family:monospace"><b>Runtime Error:</b> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
  },
};
