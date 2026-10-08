import { OrchestrationTask } from './types.js';

export class DagScheduler {
  /**
   * Validates that the tasks form a valid Directed Acyclic Graph (DAG)
   * Returns true if valid, throws an Error if circular dependency detected.
   */
  public static validateAcyclic(tasks: OrchestrationTask[]): boolean {
    const taskMap = new Map<string, OrchestrationTask>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const checkCycle = (taskId: string, path: string[]): void => {
      if (inStack.has(taskId)) {
        throw new Error(
          `Circular dependency detected in project DAG: ${[...path, taskId].join(' -> ')}`
        );
      }
      if (visited.has(taskId)) return;

      visited.add(taskId);
      inStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (taskMap.has(depId)) {
            checkCycle(depId, [...path, taskId]);
          }
        }
      }

      inStack.delete(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        checkCycle(task.id, []);
      }
    }

    return true;
  }

  /**
   * Computes topological layers/tiers for visualization and scheduling.
   * Tier 0 = tasks with no dependencies.
   * Tier N = tasks whose maximum parent dependency depth is N-1.
   */
  public static computeTiers(tasks: OrchestrationTask[]): Map<string, number> {
    const taskMap = new Map<string, OrchestrationTask>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    const tierMap = new Map<string, number>();

    const getDepth = (taskId: string, visitedInPath = new Set<string>()): number => {
      if (tierMap.has(taskId)) return tierMap.get(taskId)!;
      if (visitedInPath.has(taskId)) return 0; // Avoid infinite loops

      visitedInPath.add(taskId);
      const task = taskMap.get(taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        tierMap.set(taskId, 0);
        return 0;
      }

      let maxParentDepth = -1;
      for (const parentId of task.dependencies) {
        const parentDepth = getDepth(parentId, new Set(visitedInPath));
        if (parentDepth > maxParentDepth) {
          maxParentDepth = parentDepth;
        }
      }

      const depth = maxParentDepth + 1;
      tierMap.set(taskId, depth);
      return depth;
    };

    for (const task of tasks) {
      getDepth(task.id);
    }

    return tierMap;
  }

  /**
   * Returns list of tasks that are ready to run:
   * Status is 'pending' or 'queued', and ALL dependencies have status 'completed'.
   * Also ensures no two tasks editing the SAME file execute concurrently.
   */
  public static getReadyTasks(
    tasks: OrchestrationTask[],
    runningTasks: OrchestrationTask[],
    maxConcurrent: number
  ): OrchestrationTask[] {
    const completedIds = new Set(
      tasks.filter((t) => t.status === 'completed').map((t) => t.id)
    );

    // Identify files currently being written by running tasks
    const activeFileTargets = new Set<string>();
    runningTasks.forEach((rt) => {
      rt.targetFiles.forEach((file) => activeFileTargets.add(file));
    });

    const candidateTasks = tasks.filter((t) => {
      if (t.status !== 'pending' && t.status !== 'queued') return false;

      // Check all dependencies are completed
      const allDepsMet = t.dependencies.every((depId) => completedIds.has(depId));
      if (!allDepsMet) return false;

      // Check for file write conflicts with currently running tasks
      const hasConflict = t.targetFiles.some((f) => activeFileTargets.has(f));
      return !hasConflict;
    });

    // Return up to available slots
    const availableSlots = Math.max(0, maxConcurrent - runningTasks.length);
    return candidateTasks.slice(0, availableSlots);
  }

  /**
   * Generates a stable idempotency key for task execution
   */
  public static generateIdempotencyKey(
    projectId: string,
    taskId: string,
    targetFiles: string[],
    dependencies: string[]
  ): string {
    const raw = `${projectId}:${taskId}:${targetFiles.sort().join(',')}:${dependencies.sort().join(',')}`;
    // Simple deterministic hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `idem-${Math.abs(hash).toString(16)}`;
  }
}
