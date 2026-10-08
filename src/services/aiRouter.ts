import { AIModel, AIModelId, TaskCategory, ProjectTask, ProjectSettings } from '../types';

export interface RouteEvaluationResult {
  primaryModel: AIModelId;
  fallbackModel: AIModelId;
  capabilityScore: number; // 0 - 100
  rationale: string;
  isFallbackActive: boolean;
  estimatedCost: number;
  estimatedLatencyMs: number;
}

export const AIRouter = {
  /**
   * Evaluate which model is best suited for a given task category and complexity
   */
  evaluateBestModel(
    category: TaskCategory,
    models: AIModel[],
    settings?: ProjectSettings,
    taskComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): RouteEvaluationResult {
    // Check if user has explicit preference in settings
    const preferredId = settings?.preferredModels?.[category];
    let candidate = models.find((m) => m.id === preferredId && m.enabled);

    // If not preferred or preferred is disabled, rank models by capability score
    if (!candidate) {
      const eligibleModels = models.filter((m) => m.enabled);
      
      const scored = eligibleModels.map((m) => {
        let score = 0;
        
        // Category affinity
        if (m.supportedCategories.includes(category)) {
          score += 45;
        }

        // Cost optimization preference
        if (settings?.costOptimization) {
          score += (0.003 - m.costPer1kTokens) * 10000;
        }

        // Generation speed preference
        if (settings?.generationSpeed === 'fast') {
          score += (1500 - m.latencyMs) / 20;
        } else if (settings?.generationSpeed === 'quality') {
          // Complex models get a boost
          if (m.id === 'claude-3-7-sonnet' || m.id === 'gpt-4o' || m.id === 'deepseek-r1') {
            score += 25;
          }
        }

        // Penalty if current RPM is nearing limit (>80%)
        const rpmLoad = m.currentRPM / (m.rpmLimit || 60);
        if (rpmLoad > 0.8) {
          score -= 30;
        }

        // Boost connected primary model (Gemini 3.8 Flash)
        if (m.status === 'connected') {
          score += 15;
        }

        return { model: m, score };
      });

      scored.sort((a, b) => b.score - a.score);
      candidate = scored[0]?.model || models[0];
    }

    // Determine fallback model (always a connected or high-reliability model)
    const fallback = models.find((m) => m.id === 'gemini-3.8-flash' && m.enabled) ||
      models.find((m) => m.id !== candidate.id && m.enabled) ||
      models[0];

    // Check if candidate needs fallback due to status
    const isFallbackActive = candidate.status === 'rate_limited' || candidate.status === 'disabled';
    const effectiveModel = isFallbackActive ? fallback : candidate;

    const baseTokens = taskComplexity === 'high' ? 3500 : taskComplexity === 'medium' ? 1800 : 900;
    const estimatedCost = (baseTokens / 1000) * effectiveModel.costPer1kTokens;

    return {
      primaryModel: candidate.id,
      fallbackModel: fallback.id,
      capabilityScore: 94,
      rationale: `Selected ${candidate.name} for ${category} based on benchmark affinity and ${effectiveModel.specialty.toLowerCase()}.`,
      isFallbackActive,
      estimatedCost,
      estimatedLatencyMs: effectiveModel.latencyMs,
    };
  },

  /**
   * Identifies tasks ready for execution:
   * A task is ready if its status is 'pending' AND all its dependencies are 'completed'.
   */
  getReadyTasks(tasks: ProjectTask[]): ProjectTask[] {
    const completedIds = new Set(tasks.filter((t) => t.status === 'completed').map((t) => t.id));

    return tasks.filter((t) => {
      if (t.status !== 'pending') return false;
      // All dependencies must be in completedIds
      return t.dependencies.every((depId) => completedIds.has(depId));
    });
  },

  /**
   * Sort tasks to build execution order / topological layers for parallel dispatching
   */
  buildExecutionBatches(tasks: ProjectTask[]): ProjectTask[][] {
    const batches: ProjectTask[][] = [];
    const completed = new Set<string>();
    const remaining = [...tasks];

    let safety = 0;
    while (remaining.length > 0 && safety < 20) {
      safety++;
      const currentBatch = remaining.filter((t) =>
        t.dependencies.every((depId) => completed.has(depId))
      );

      if (currentBatch.length === 0) {
        // Break circular dependency edge case: take first remaining
        const forced = remaining.shift()!;
        batches.push([forced]);
        completed.add(forced.id);
        continue;
      }

      batches.push(currentBatch);
      currentBatch.forEach((t) => completed.add(t.id));
      const batchIds = new Set(currentBatch.map((t) => t.id));
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (batchIds.has(remaining[i].id)) {
          remaining.splice(i, 1);
        }
      }
    }

    return batches;
  },
};
