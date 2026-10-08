import {
  CompilationError,
  SandboxExecutionOptions,
  SandboxReport,
  TestResultItem,
} from './types.js';
import { SandboxRunner } from './sandboxRunner.js';
import { CodingAgentService } from '../services/codingAgent.js';
import { projectIntegrationEngine } from '../integration/integrationEngine.js';
import { TaskRouter } from '../orchestrator/taskRouter.js';

export class SandboxManager {
  private static reports: Map<string, SandboxReport> = new Map(); // projectId -> SandboxReport

  /**
   * Main Sandbox Workflow:
   * 1. Create isolated execution environment.
   * 2. Install/verify project dependencies.
   * 3. Run build command.
   * 4. Capture compilation errors and logs.
   * 5. Run available tests.
   * 6. Identify files responsible for failures.
   * 7. Create targeted repair tasks.
   * 8. Apply fixes and rerun relevant tests.
   * 9. Stop after configurable max repair attempts.
   * 10. Save final build and test report.
   */
  public static async executeProjectSandbox(
    options: SandboxExecutionOptions
  ): Promise<{ success: boolean; report: SandboxReport }> {
    const {
      projectId,
      projectName,
      projectDescription = '',
      maxRepairAttempts = 3,
      timeoutMs = 20000,
      runTests = true,
      preferredModel,
    } = options;

    const vfs = projectIntegrationEngine.getOrCreateVFS(projectId);
    const initialFiles = vfs.getAllFiles();

    // 1. Create isolated execution environment
    const sandboxDir = SandboxRunner.prepareSandboxDirectory(projectId, initialFiles);

    // 2. Install project dependencies in sandbox
    const installResult = await SandboxRunner.installDependencies(sandboxDir, timeoutMs);

    let attempt = 1;
    let buildResult = await SandboxRunner.runBuild(sandboxDir, timeoutMs);
    let testResult = runTests
      ? await SandboxRunner.runTests(sandboxDir, timeoutMs)
      : {
          success: true,
          durationMs: 0,
          logs: 'Tests skipped by config.',
          tests: [],
          passedCount: 0,
          failedCount: 0,
        };

    const repairHistory: SandboxReport['repairHistory'] = [];

    // Loop for targeted repairs if failures are identified and attempts remain
    while (
      (!buildResult.success || !testResult.success) &&
      attempt <= maxRepairAttempts
    ) {
      // 6. Identify the files responsible for failures
      const failingFilesSet = new Set<string>();
      buildResult.failingFiles.forEach((f) => failingFilesSet.add(f));

      testResult.tests
        .filter((t) => t.status === 'failed' && t.file)
        .forEach((t) => failingFilesSet.add(t.file!));

      const failingFiles = Array.from(failingFilesSet);
      if (failingFiles.length === 0) {
        // Fallback: identify primary component
        failingFiles.push('src/App.tsx');
      }

      const failureErrorsSummary = [
        ...buildResult.compilationErrors.map(
          (e) => `[Compilation Error] ${e.file}:${e.line || 1} - ${e.message}`
        ),
        ...testResult.tests
          .filter((t) => t.status === 'failed')
          .map((t) => `[Test Failure] ${t.name} (${t.file || 'unknown'}): ${t.message}`),
      ].join('\n');

      // 7. Create targeted repair task and dispatch to coding model
      const routing = TaskRouter.evaluateTaskRouting('architecture', 3500, preferredModel);
      const targetRepairFile = failingFiles[0];
      const existingFileObj = vfs.getFile(targetRepairFile);

      const prompt = `You are an elite Software Debug & Repair Engineer.
The project failed verification in an isolated sandbox execution environment.

VERIFICATION ERRORS & LOGS:
${failureErrorsSummary}

TARGET FAILING FILE:
${targetRepairFile}

CURRENT FILE CONTENT:
${existingFileObj ? existingFileObj.content : '(File missing)'}

OBJECTIVE:
Diagnose the failure, fix the root cause, repair any syntax or type mismatches, and return the complete, working, bug-free file.

RETURN VALID JSON:
{
  "logs": "Detailed explanation of bug cause and surgical fix applied",
  "files": [
    {
      "path": "${targetRepairFile}",
      "content": "Complete, working repaired code here"
    }
  ]
}`;

      let repairSuccess = false;
      let repairLogs = '';

      try {
        const repairRes = await CodingAgentService.executeTask({
          task: {
            id: `sandbox-repair-${attempt}`,
            title: `Sandbox Repair [Attempt ${attempt}]: ${targetRepairFile}`,
            category: 'architecture',
            description: `Fix verification error: ${failureErrorsSummary.slice(0, 150)}`,
            targetFiles: [targetRepairFile],
            assignedModel: routing.assignedModelId,
          },
          projectContext: {
            name: projectName,
            description: projectDescription,
          },
          existingFiles: vfs.getAllFiles(),
          overrideModel: routing.assignedModelId,
        });

        if (repairRes.success && repairRes.files && repairRes.files.length > 0) {
          // 8. Apply fixes safely to VirtualProjectFS
          const fixed = repairRes.files[0];
          vfs.applyChange({
            taskId: `sandbox-repair-${attempt}`,
            taskTitle: `Sandbox Auto-Repair Attempt ${attempt}`,
            modelId: routing.assignedModelId,
            path: fixed.path,
            changeType: 'modify',
            content: fixed.content,
            description: `Auto-repair attempt ${attempt} for sandbox failure`,
          });

          // Re-write to sandbox directory
          SandboxRunner.prepareSandboxDirectory(projectId, vfs.getAllFiles());

          repairSuccess = true;
          repairLogs = repairRes.logs || 'Targeted fix synthesized and applied.';
        } else {
          repairLogs = repairRes.error || 'Repair agent failed to synthesize replacement.';
        }
      } catch (err: any) {
        repairLogs = err?.message || 'Repair execution exception.';
      }

      // Re-run build & tests
      buildResult = await SandboxRunner.runBuild(sandboxDir, timeoutMs);
      testResult = runTests
        ? await SandboxRunner.runTests(sandboxDir, timeoutMs)
        : testResult;

      const outcome = buildResult.success && testResult.success ? 'resolved' : 'still_failing';

      repairHistory.push({
        attempt,
        failingFiles,
        repairsDispatched: 1,
        outcome,
        summary: `Attempt ${attempt}: ${repairSuccess ? 'Fix applied' : 'Fix failed'} → ${outcome}. (${repairLogs.slice(0, 120)})`,
        timestamp: Date.now(),
      });

      if (buildResult.success && testResult.success) {
        break; // Successfully repaired!
      }

      attempt += 1;
    }

    const overallPassed = buildResult.success && testResult.success;

    // 10. Save final build and test report
    const report: SandboxReport = {
      id: `sandbox-report-${Date.now()}`,
      projectId,
      timestamp: Date.now(),
      overallPassed,
      attemptCount: attempt,
      maxAttempts: maxRepairAttempts,
      sandboxDirectory: sandboxDir,
      installPhase: installResult,
      buildPhase: buildResult,
      testPhase: testResult,
      repairHistory,
      summary: overallPassed
        ? `✓ Sandboxed execution verified successfully. Build passed cleanly. All ${testResult.passedCount} tests passed. (Attempts: ${attempt}/${maxRepairAttempts}).`
        : `✕ Sandboxed verification failed after ${attempt} attempt(s). Build: ${
            buildResult.success ? 'passed' : 'FAILED'
          }. Tests: ${testResult.failedCount} failed out of ${testResult.tests.length}.`,
    };

    this.reports.set(projectId, report);

    return {
      success: overallPassed,
      report,
    };
  }

  public static getReport(projectId: string): SandboxReport | undefined {
    return this.reports.get(projectId);
  }

  public static getAllReports(): Record<string, SandboxReport> {
    const record: Record<string, SandboxReport> = {};
    for (const [k, v] of this.reports.entries()) {
      record[k] = v;
    }
    return record;
  }
}
