import { ACS_CONFIG } from '../agent/constants';
import { ComplexityAssessment, HorizonType, ReActStep, StrategyType } from '../agent/types';
import { ParsedIntent } from './PerceptionEngine';

export class MetaCognition {
  private static instance: MetaCognition | null = null;

  public static getInstance(): MetaCognition {
    if (!MetaCognition.instance) {
      MetaCognition.instance = new MetaCognition();
    }
    return MetaCognition.instance;
  }

  /**
   * Complexity Oracle: Analyzes task features and computes a 0..1 complexity score,
   * assigning horizon class and starting reasoning strategy.
   */
  public assessComplexity(intent: ParsedIntent, memoryMatchScore = 0.5): ComplexityAssessment {
    const text = intent.rawInput;
    const lower = text.toLowerCase();

    // 1. Estimated subtask count (heuristic)
    let estimatedSubtasks = 1;
    if (intent.category === 'multi_step_goal') {
      estimatedSubtasks = Math.max(3, Math.min(10, Math.floor(text.split(/[,;.!?\n]|\band\b|\bthen\b/).length * 0.8)));
    } else if (intent.category === 'code_modification' || intent.category === 'troubleshooting') {
      estimatedSubtasks = 3;
    }

    // 2. Dependency depth estimation
    const dependencyDepth = Math.max(1, Math.min(5, Math.ceil(estimatedSubtasks * 0.5)));

    // 3. Ambiguity score (higher if short prompt with vague verbs)
    let ambiguityScore = 0.2;
    if (text.length < 25 && !text.includes('$')) ambiguityScore = 0.65;
    if (lower.includes('fix it') || lower.includes('make it work') || lower.includes('help')) ambiguityScore = 0.85;

    // 4. Novelty score (inversely related to memory match)
    const noveltyScore = Math.max(0, Math.min(1, 1 - memoryMatchScore));

    // 5. Tool diversity score
    let toolDiversityScore = 0.2;
    if (intent.entities.filePaths.length > 0 && intent.entities.urls.length > 0) toolDiversityScore = 0.7;
    else if (intent.category === 'multi_step_goal') toolDiversityScore = 0.6;

    // Normalized Complexity Formula
    const subtaskNormalized = Math.min(1, estimatedSubtasks / 8);
    const depthNormalized = Math.min(1, dependencyDepth / 4);

    const calculatedComplexity =
      0.25 * subtaskNormalized +
      0.20 * depthNormalized +
      0.20 * ambiguityScore +
      0.15 * noveltyScore +
      0.10 * toolDiversityScore +
      0.10 * (1 - memoryMatchScore);

    // Horizon & Strategy classification
    let horizonClass: HorizonType;
    let recommendedStrategy: StrategyType;

    if (calculatedComplexity < ACS_CONFIG.SHORT_HORIZON_MAX_COMPLEXITY) {
      horizonClass = 'short';
      recommendedStrategy = 'react';
    } else if (calculatedComplexity < ACS_CONFIG.MEDIUM_HORIZON_MAX_COMPLEXITY) {
      horizonClass = 'medium';
      recommendedStrategy = 'htn';
    } else {
      horizonClass = 'long';
      recommendedStrategy = 'lats';
    }

    const reasoning = `Computed complexity ${calculatedComplexity.toFixed(2)} [Subtasks: ~${estimatedSubtasks}, Depth: ${dependencyDepth}, Ambiguity: ${ambiguityScore.toFixed(2)}, Novelty: ${noveltyScore.toFixed(2)}]. Optimal initial strategy: ${recommendedStrategy.toUpperCase()}.`;

    const riskFactors: string[] = [];
    if (ambiguityScore > 0.6) riskFactors.push('High intent ambiguity');
    if (estimatedSubtasks > 5) riskFactors.push('Deep subtask dependency chain');
    if (noveltyScore > 0.7) riskFactors.push('Unseen task pattern in memory');

    return {
      taskDescription: text,
      subtaskCountEstimate: estimatedSubtasks,
      dependencyDepth,
      ambiguityScore,
      noveltyScore,
      toolDiversityScore,
      memoryMatchScore,
      calculatedComplexity,
      horizonClass,
      recommendedStrategy,
      reasoning,
      riskFactors,
    };
  }

  /**
   * Dynamic Horizon Switching Monitor:
   * Called after each action step to evaluate if strategy should escalate or downgrade.
   */
  public evaluateDynamicSwitch(params: {
    currentHorizon: HorizonType;
    currentStrategy: StrategyType;
    recentSteps: ReActStep[];
    totalStepsTaken: number;
    completedSubtaskRatio?: number; // 0..1 if in HTN
  }): {
    shouldSwitch: boolean;
    targetHorizon: HorizonType;
    targetStrategy: StrategyType;
    triggerReason: string;
  } {
    const { currentStrategy, recentSteps, completedSubtaskRatio } = params;

    // ── Escalation Check: ReAct -> HTN (Short -> Medium) ──
    if (currentStrategy === 'react') {
      const lastTwo = recentSteps.slice(-2);
      const lowConfidenceStreak =
        lastTwo.length >= 2 &&
        lastTwo.every((s) => s.confidence < ACS_CONFIG.REACT_CONFIDENCE_ESCALATION_THRESHOLD);

      const recentFailures = recentSteps
        .slice(-3)
        .filter((s) => s.observation && s.observation.toLowerCase().includes('error')).length;

      if (lowConfidenceStreak || recentFailures >= 2 || params.totalStepsTaken >= ACS_CONFIG.REACT_MAX_STEPS) {
        return {
          shouldSwitch: true,
          targetHorizon: 'medium',
          targetStrategy: 'htn',
          triggerReason: lowConfidenceStreak
            ? 'Low confidence streak detected in reactive loop'
            : recentFailures >= 2
            ? 'Multiple consecutive tool execution errors'
            : 'Max reactive steps exceeded without completion',
        };
      }
    }

    // ── Escalation Check: HTN -> LATS (Medium -> Long) ──
    if (currentStrategy === 'htn') {
      const recentFailures = recentSteps
        .slice(-3)
        .filter((s) => s.observation && s.observation.toLowerCase().includes('error')).length;

      if (recentFailures >= 3) {
        return {
          shouldSwitch: true,
          targetHorizon: 'long',
          targetStrategy: 'lats',
          triggerReason: 'Repeated subtask execution breakdown; engaging LATS tree exploration',
        };
      }
    }

    // ── Downgrade Check: HTN -> ReAct (Medium -> Short) ──
    if (currentStrategy === 'htn' && completedSubtaskRatio !== undefined && completedSubtaskRatio >= 0.8) {
      return {
        shouldSwitch: true,
        targetHorizon: 'short',
        targetStrategy: 'react',
        triggerReason: 'Final simple subtasks remaining; switching to high-speed reactive finishing',
      };
    }

    return {
      shouldSwitch: false,
      targetHorizon: params.currentHorizon,
      targetStrategy: currentStrategy,
      triggerReason: 'Trajectory within expected operating parameters',
    };
  }
}

export const metaCognition = MetaCognition.getInstance();
