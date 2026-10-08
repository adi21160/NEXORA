import {
  BrokenImport,
  FileConflict,
  TargetedRepairTask,
  ValidationReport,
} from './types.js';
import { TaskRouter } from '../orchestrator/taskRouter.js';
import { CodingAgentService } from '../services/codingAgent.js';
import { VirtualProjectFS } from './virtualFS.js';

export class RepairDispatcher {
  /**
   * Evaluates validation failures and creates targeted repair tasks
   */
  public static createRepairTasks(
    projectId: string,
    parentTaskId: string,
    validation: ValidationReport,
    conflicts: FileConflict[]
  ): TargetedRepairTask[] {
    const repairTasks: TargetedRepairTask[] = [];

    // 1. Broken Imports & Missing Exports
    for (const broken of validation.brokenImports) {
      const routing = TaskRouter.evaluateTaskRouting('frontend', 2500);

      if (broken.errorType === 'file_not_found') {
        const expectedFile = broken.importedPath.startsWith('.')
          ? `${broken.importedPath}.tsx`
          : broken.importedPath;

        repairTasks.push({
          repairTaskId: `repair-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          parentTaskId,
          targetFile: broken.resolvedPath || expectedFile,
          issueType: 'broken_import',
          description: `Create missing component/module "${broken.importedPath}" required by "${broken.importerPath}".`,
          assignedModel: routing.assignedModelId,
          assignedProvider: routing.assignedProvider,
          requiredFix: `Implement missing file "${expectedFile}" exporting "${broken.importedSymbol}".`,
          createdAt: Date.now(),
          status: 'pending',
        });
      } else if (broken.errorType === 'symbol_not_exported') {
        repairTasks.push({
          repairTaskId: `repair-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          parentTaskId,
          targetFile: broken.resolvedPath || broken.importedPath,
          issueType: 'missing_export',
          description: `File "${broken.resolvedPath}" is missing export "${broken.importedSymbol}" expected by "${broken.importerPath}".`,
          assignedModel: routing.assignedModelId,
          assignedProvider: routing.assignedProvider,
          requiredFix: `Export "${broken.importedSymbol}" from "${broken.resolvedPath}".`,
          createdAt: Date.now(),
          status: 'pending',
        });
      }
    }

    // 2. Conflicts requiring targeted repair
    for (const conflict of conflicts) {
      if (conflict.resolution === 'repair_dispatched') {
        const routing = TaskRouter.evaluateTaskRouting('architecture', 3500);
        repairTasks.push({
          repairTaskId: `repair-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          parentTaskId: conflict.sourceTaskId,
          targetFile: conflict.path,
          issueType: 'syntax_error',
          description: `Resolve merge conflict in "${conflict.path}": ${conflict.reason}`,
          assignedModel: routing.assignedModelId,
          assignedProvider: routing.assignedProvider,
          requiredFix: `Harmonize changes from both tasks into a unified, non-conflicting ${conflict.path}.`,
          createdAt: Date.now(),
          status: 'pending',
        });
      }
    }

    return repairTasks;
  }

  /**
   * Executes a targeted repair task directly with an AI model
   */
  public static async executeRepairTask(
    repair: TargetedRepairTask,
    projectContext: { name: string; description: string; stack?: string },
    vfs: VirtualProjectFS
  ): Promise<{ success: boolean; error?: string; fixedFile?: { path: string; content: string } }> {
    repair.status = 'executing';

    const existingFile = vfs.getFile(repair.targetFile);
    const prompt = `You are a Senior Code Repair Engineer.
An automated integration check detected an integration failure:
ISSUE TYPE: ${repair.issueType}
TARGET FILE: ${repair.targetFile}
DEFECT DESCRIPTION: ${repair.description}
REQUIRED FIX: ${repair.requiredFix}

CURRENT FILE CONTENT:
${existingFile ? existingFile.content : '(File does not exist yet)'}

Please provide the corrected, complete file content that resolves the defect completely.
Output valid JSON format matching:
{
  "logs": "Detailed explanation of the targeted repair applied",
  "files": [
    {
      "path": "${repair.targetFile}",
      "content": "Full corrected code here"
    }
  ]
}`;

    const res = await CodingAgentService.executeTask({
      task: {
        id: repair.repairTaskId,
        title: `Targeted Repair: ${repair.targetFile}`,
        category: 'architecture',
        description: repair.requiredFix,
        targetFiles: [repair.targetFile],
        assignedModel: repair.assignedModel,
      },
      projectContext,
      existingFiles: vfs.getAllFiles(),
      overrideModel: repair.assignedModel,
    });

    if (res.success && res.files && res.files.length > 0) {
      repair.status = 'resolved';
      return {
        success: true,
        fixedFile: res.files[0],
      };
    } else {
      repair.status = 'failed';
      return {
        success: false,
        error: res.error || 'Repair model failed to produce resolved code.',
      };
    }
  }
}
