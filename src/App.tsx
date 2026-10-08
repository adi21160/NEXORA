/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, AIModel, QuotaStats } from './types';
import { StorageService } from './services/storage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { ModelsManagerView } from './components/models/ModelsManagerView';
import { QuotasView } from './components/quotas/QuotasView';
import { MyProjectsView } from './components/projects/MyProjectsView';
import { TaskManagerView } from './components/tasks/TaskManagerView';
import { SettingsView } from './components/settings/SettingsView';
import { HelpDocView } from './components/help/HelpDocView';
import { ProjectCreationModal } from './components/project-creator/ProjectCreationModal';
import { ProjectTemplate } from './data/projectTemplates';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    StorageService.getActiveProjectId()
  );
  const [models, setModels] = useState<AIModel[]>(() => StorageService.getModels());
  const [quotas, setQuotas] = useState<QuotaStats>(() => StorageService.getQuotaStats());
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [initialModalPrompt, setInitialModalPrompt] = useState('');

  // Persist projects whenever changed
  useEffect(() => {
    StorageService.saveProjects(projects);
  }, [projects]);

  // Persist models
  useEffect(() => {
    StorageService.saveModels(models);
  }, [models]);

  // Persist quotas
  useEffect(() => {
    StorageService.saveQuotaStats(quotas);
  }, [quotas]);

  // Persist active project
  useEffect(() => {
    if (activeProjectId) {
      StorageService.setActiveProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleOpenProjectWorkspace = (id: string) => {
    setActiveProjectId(id);
    setCurrentView('workspace');
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleUpdateModels = (updatedModels: AIModel[]) => {
    setModels(updatedModels);
  };

  const handleUpdateQuotas = (updatedQuotas: QuotaStats) => {
    setQuotas(updatedQuotas);
  };

  const handleDuplicateProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    const duplicated: Project = {
      ...target,
      id: `proj-${Date.now()}`,
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    setProjects((prev) => [duplicated, ...prev]);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert('Cannot delete the only remaining project.');
      return;
    }
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (activeProjectId === id) {
      setActiveProjectId(updated[0].id);
    }
  };

  const handleOpenNewProjectModal = (initialPrompt: string = '') => {
    setInitialModalPrompt(initialPrompt);
    setIsNewProjectModalOpen(true);
  };

  const handleStartFromTemplate = (template: ProjectTemplate) => {
    setInitialModalPrompt(`${template.name}: ${template.description}`);
    setIsNewProjectModalOpen(true);
  };

  const handleStartProjectGeneration = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setCurrentView('workspace');
  };

  const activeTasksCount = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === 'running').length,
    0
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => handleOpenNewProjectModal()}
        models={models}
        onNavigate={setCurrentView}
        currentView={currentView}
      />

      {/* Main Body with Sidebar + View Container */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenNewProjectModal={() => handleOpenNewProjectModal()}
          projectsCount={projects.length}
          activeTasksCount={activeTasksCount}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#070b14]">
          {currentView === 'dashboard' && (
            <MainDashboard
              projects={projects}
              models={models}
              quotas={quotas}
              onOpenNewProjectModal={handleOpenNewProjectModal}
              onOpenProjectWorkspace={handleOpenProjectWorkspace}
              onNavigate={setCurrentView}
              onStartFromTemplate={handleStartFromTemplate}
            />
          )}

          {currentView === 'workspace' && activeProject && (
            <WorkspaceView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              models={models}
              onOpenNewProject={() => handleOpenNewProjectModal()}
            />
          )}

          {currentView === 'projects' && (
            <MyProjectsView
              projects={projects}
              onOpenProjectWorkspace={handleOpenProjectWorkspace}
              onOpenNewProjectModal={() => handleOpenNewProjectModal()}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {currentView === 'models' && (
            <ModelsManagerView models={models} onUpdateModels={handleUpdateModels} />
          )}

          {currentView === 'task-manager' && (
            <TaskManagerView
              projects={projects}
              models={models}
              onOpenProjectWorkspace={handleOpenProjectWorkspace}
            />
          )}

          {currentView === 'quotas' && (
            <QuotasView
              quotas={quotas}
              onUpdateQuotas={handleUpdateQuotas}
              models={models}
            />
          )}

          {currentView === 'settings' && <SettingsView />}

          {currentView === 'help' && <HelpDocView />}
        </main>
      </div>

      {/* Project Creation Wizard Modal */}
      <ProjectCreationModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        models={models}
        onStartProjectGeneration={handleStartProjectGeneration}
        initialPrompt={initialModalPrompt}
      />
    </div>
  );
}
