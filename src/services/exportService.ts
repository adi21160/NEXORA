import JSZip from 'jszip';
import { Project } from '../types';

export const ExportService = {
  /**
   * Generates and triggers download of a complete project ZIP file
   */
  async exportProjectAsZip(project: Project): Promise<void> {
    const zip = new JSZip();

    // Add all project files
    for (const [path, file] of Object.entries(project.files)) {
      zip.file(path, file.content);
    }

    // Ensure package.json exists
    if (!project.files['package.json']) {
      const pkgJson = {
        name: project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'lucide-react': '^0.546.0',
          tailwindcss: '^4.3.0',
        },
      };
      zip.file('package.json', JSON.stringify(pkgJson, null, 2));
    }

    // Ensure README.md exists
    if (!project.files['README.md']) {
      const readme = `# ${project.name}

${project.description}

### Technology Stack
${project.stack}

### Generated with NexusAI Studio
Collaborative multi-AI development platform.
- **Tasks Executed**: ${project.tasks.length}
- **Models Utilized**: ${project.stats.modelsUsed.join(', ')}
- **Generated On**: ${new Date(project.createdAt).toLocaleDateString()}

### Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`
`;
      zip.file('README.md', readme);
    }

    // Add .env.example
    if (!project.files['.env.example']) {
      zip.file(
        '.env.example',
        `# Application Environment Variables\nVITE_APP_NAME="${project.name}"\nVITE_ENV="production"\n`
      );
    }

    // Generate blob and trigger download
    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-nexusai.zip`;

    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export an individual file
   */
  downloadSingleFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
