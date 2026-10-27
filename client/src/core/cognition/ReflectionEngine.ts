import { ReActStep, Reflection, ToolExecutionResult } from '../agent/types';

export class ReflectionEngine {
  /**
   * Generates a step-level reflection after an action has executed
   */
  public reflectOnStep(params: {
    step: ReActStep;
    toolResult?: ToolExecutionResult;
    goal: string;
  }): Reflection {
    const { step, toolResult, goal } = params;
    const isSuccess = toolResult ? toolResult.success : true;
    const output = toolResult ? toolResult.output : step.observation || '';

    const lessons: string[] = [];
    let surpriseLevel = 0.1;
    let confidenceDelta = 0.05;

    if (!isSuccess) {
      surpriseLevel = 0.8;
      confidenceDelta = -0.25;
      lessons.push(
        `Operation failed with: "${(toolResult?.error || '').slice(0, 100)}". Alternative parameters or fallback tool required.`
      );
    } else if (output.toLowerCase().includes('warning') || output.toLowerCase().includes('not found')) {
      surpriseLevel = 0.45;
      confidenceDelta = -0.05;
      lessons.push('Output produced warnings; subsequent step should verify output integrity.');
    } else {
      lessons.push(`Successfully validated step towards goal "${goal.slice(0, 40)}".`);
    }

    return {
      timestamp: Date.now(),
      actionSummary: step.action ? `${step.action.tool}(${JSON.stringify(step.action.args).slice(0, 60)}...)` : 'Pure reasoning',
      outcomeAssessment: isSuccess ? 'Effective progress toward target state' : 'Execution obstacle detected',
      surpriseLevel,
      lessonsLearned: lessons,
      planAdjustmentRequired: !isSuccess,
      confidenceDelta,
    };
  }

  /**
   * Generates a task-level final reflection synthesizing the complete trajectory
   */
  public reflectOnCompletedTask(params: {
    goal: string;
    totalSteps: number;
    durationMs: number;
    outcome: 'success' | 'partial' | 'failure';
    stepReflections: Reflection[];
  }): Reflection {
    const { goal, outcome, stepReflections } = params;

    const consolidatedLessons: string[] = [];
    for (const r of stepReflections) {
      consolidatedLessons.push(...r.lessonsLearned);
    }

    return {
      timestamp: Date.now(),
      actionSummary: `Completed task "${goal.slice(0, 60)}" across ${params.totalSteps} steps in ${(params.durationMs / 1000).toFixed(1)}s.`,
      outcomeAssessment: `Final outcome: ${outcome.toUpperCase()}`,
      surpriseLevel: outcome === 'success' ? 0.05 : 0.7,
      lessonsLearned: Array.from(new Set(consolidatedLessons)).slice(0, 5),
      planAdjustmentRequired: false,
      confidenceDelta: outcome === 'success' ? 0.3 : -0.3,
    };
  }
}

export const reflectionEngine = new ReflectionEngine();
