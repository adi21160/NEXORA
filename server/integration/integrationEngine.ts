import {
  FileConflict,
  IntegrationReport,
  StructuredFileChange,
  TargetedRepairTask,
  ValidationReport,
  VirtualFile,
} from './types.js';
import { VirtualProjectFS } from './virtualFS.js';
import { ConflictDetector } from './conflictDetector.js';
import { ImportExportValidator } from './importExportValidator.js';
import { ApiInterfaceMatcher } from './apiInterfaceMatcher.js';
import { DependencyManager } from './dependencyManager.js';
import { RepairDispatcher } from './repairDispatcher.js';
import { ProjectSpecification } from '../orchestrator/types.js';

export class ProjectIntegrationEngine {
  private static instance: ProjectIntegrationEngine;
  private virtualFilesystems: Map<string, VirtualProjectFS> = new Map();
  private reports: Map<string, IntegrationReport[]> = new Map(); // projectId -> reports
  private repairTasks: Map<string, TargetedRepairTask[]> = new Map(); // projectId -> repairs

  private constructor() {}

  public static getInstance(): ProjectIntegrationEngine {
    if (!ProjectIntegrationEngine.instance) {
      ProjectIntegrationEngine.instance = new ProjectIntegrationEngine();
    }
    return ProjectIntegrationEngine.instance;
  }

  /**
   * Gets or initializes the virtual filesystem for a given project
   */
  public getOrCreateVFS(
    projectId: string,
    initialFiles?: Record<string, { content: string; language?: string; version?: number }>
  ): VirtualProjectFS {
    let vfs = this.virtualFilesystems.get(projectId);
    if (!vfs) {
      vfs = new VirtualProjectFS(projectId, initialFiles);
      this.virtualFilesystems.set(projectId, vfs);
    }
    return vfs;
  }

  public getVFS(projectId: string): VirtualProjectFS | undefined {
    return this.virtualFilesystems.get(projectId);
  }

  /**
   * Main integration pipeline:
   * Accepts structured file changes, detects conflicts, applies changes safely,
   * validates imports/exports, synchronizes dependencies, checks API contracts,
   * tracks versions, preserves unrelated files, and dispatches repair tasks.
   */
  public async integrateTaskOutput(params: {
    projectId: string;
    taskId: string;
    taskTitle: string;
    modelId: string;
    files: { path: string; content: string }[];
    projectContext: { name: string; description: string; stack?: string };
    specification?: ProjectSpecification;
    autoRepair?: boolean;
  }): Promise<{
    success: boolean;
    report: IntegrationReport;
    updatedFiles: Record<string, VirtualFile>;
  }> {
    const {
      projectId,
      taskId,
      taskTitle,
      modelId,
      files,
      projectContext,
      specification,
      autoRepair = true,
    } = params;

    const vfs = this.getOrCreateVFS(projectId);

    // 1. Convert raw generated files into formal StructuredFileChange records
    // NEVER concatenate raw AI responses into a single file!
    const changes: StructuredFileChange[] = files.map((f) => ({
      taskId,
      taskTitle,
      modelId,
      path: f.path,
      changeType: vfs.hasFile(f.path) ? 'modify' : 'create',
      content: f.content,
      previousVersion: vfs.getFile(f.path)?.version,
      description: `Synthesized by ${modelId} for [${taskId}] ${taskTitle}`,
    }));

    // 2. Conflict Detection
    const conflictResult = ConflictDetector.detectConflicts(changes, vfs);

    // 3. Apply safe changes into VirtualProjectFS
    const appliedFiles: { path: string; changeType: string; version: number }[] = [];
    for (const change of conflictResult.safeChanges) {
      const res = vfs.applyChange(change);
      if (res.applied) {
        appliedFiles.push({
          path: change.path,
          changeType: change.changeType,
          version: res.version,
        });
      }
    }

    // 4. Validate Imports and Exports
    const validationReport = ImportExportValidator.validate(vfs);

    // 5. Check API Interface Matching against Specification Contracts
    const apiIssues = ApiInterfaceMatcher.checkContracts(specification, vfs);
    validationReport.apiMismatches = apiIssues;

    // 6. Maintain Consistent Project Dependencies in package.json
    const missingDeps = DependencyManager.syncDependencies(vfs);
    validationReport.missingDependencies = missingDeps;

    // 7. Calculate Integration Health Score (0 - 100)
    let healthScore = 100;
    healthScore -= conflictResult.conflicts.length * 25;
    healthScore -= validationReport.brokenImports.length * 15;
    healthScore -= validationReport.apiMismatches.length * 10;
    healthScore -= validationReport.syntaxIssues.length * 15;
    healthScore = Math.max(0, Math.min(100, healthScore));

    // 8. Identify integration failures and assign targeted repair tasks
    let targetedRepairTasks: TargetedRepairTask[] = [];
    if (
      validationReport.brokenImports.length > 0 ||
      conflictResult.conflicts.length > 0
    ) {
      targetedRepairTasks = RepairDispatcher.createRepairTasks(
        projectId,
        taskId,
        validationReport,
        conflictResult.conflicts
      );

      // Store repair tasks
      const existingRepairs = this.repairTasks.get(projectId) || [];
      this.repairTasks.set(projectId, [...existingRepairs, ...targetedRepairTasks]);

      // If autoRepair enabled, execute first pending repair task in background
      if (autoRepair && targetedRepairTasks.length > 0) {
        const firstRepair = targetedRepairTasks[0];
        setImmediate(async () => {
          try {
            const repairResult = await RepairDispatcher.executeRepairTask(
              firstRepair,
              projectContext,
              vfs
            );
            if (repairResult.success && repairResult.fixedFile) {
              vfs.applyChange({
                taskId: firstRepair.repairTaskId,
                taskTitle: `Targeted Auto-Repair (${firstRepair.issueType})`,
                modelId: firstRepair.assignedModel,
                path: repairResult.fixedFile.path,
                changeType: 'modify',
                content: repairResult.fixedFile.content,
                description: `Auto-repaired: ${firstRepair.requiredFix}`,
              });
            }
          } catch (repairErr) {
            console.warn('[ProjectIntegrationEngine] Targeted repair error:', repairErr);
          }
        });
      }
    }

    // 9. Generate Integration Report
    const report: IntegrationReport = {
      id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId,
      taskId,
      taskTitle,
      timestamp: Date.now(),
      appliedFiles,
      conflicts: conflictResult.conflicts,
      validation: validationReport,
      targetedRepairTasks,
      healthScore,
      summary: `Integrated ${appliedFiles.length} file(s). Health Score: ${healthScore}%. ${
        conflictResult.conflicts.length > 0
          ? `${conflictResult.conflicts.length} conflict(s) detected.`
          : 'Zero merge conflicts.'
      } ${
        validationReport.brokenImports.length > 0
          ? `${validationReport.brokenImports.length} broken import(s).`
          : 'All imports/exports validated.'
      }`,
    };

    const projectReports = this.reports.get(projectId) || [];
    projectReports.push(report);
    this.reports.set(projectId, projectReports);

    return {
      success: conflictResult.conflicts.length === 0 && validationReport.brokenImports.length === 0,
      report,
      updatedFiles: vfs.getAllFiles(),
    };
  }

  /**
   * Runs an on-demand comprehensive integrity audit of the project
   */
  public runIntegrityAudit(
    projectId: string,
    spec?: ProjectSpecification
  ): {
    healthScore: number;
    validation: ValidationReport;
    fileCount: number;
    versionsTracked: number;
  } {
    const vfs = this.getOrCreateVFS(projectId);
    const validation = ImportExportValidator.validate(vfs);
    validation.apiMismatches = ApiInterfaceMatcher.checkContracts(spec, vfs);
    validation.missingDependencies = DependencyManager.syncDependencies(vfs);

    let healthScore = 100;
    healthScore -= validation.brokenImports.length * 15;
    healthScore -= validation.apiMismatches.length * 10;
    healthScore -= validation.syntaxIssues.length * 15;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const files = vfs.getAllFiles();
    const versionsTracked = Object.values(files).reduce(
      (acc, f) => acc + f.history.length,
      0
    );

    return {
      healthScore,
      validation,
      fileCount: Object.keys(files).length,
      versionsTracked,
    };
  }

  public getReports(projectId: string): IntegrationReport[] {
    return this.reports.get(projectId) || [];
  }

  public getRepairTasks(projectId: string): TargetedRepairTask[] {
    return this.repairTasks.get(projectId) || [];
  }

  public rollbackFile(projectId: string, filePath: string, targetVersion: number): boolean {
    const vfs = this.virtualFilesystems.get(projectId);
    if (!vfs) return false;
    return vfs.rollbackFile(filePath, targetVersion);
  }
}

export const projectIntegrationEngine = ProjectIntegrationEngine.getInstance();
