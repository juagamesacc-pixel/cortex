import {
  AgentEventListener,
  AgentLifecycleEvent,
  ComplexityAssessment,
  HorizonType,
  ReActStep,
  Reflection,
  StrategyType,
  TaskPlan,
} from './types';
import { PerceptionEngine } from '../cognition/PerceptionEngine';
import { metaCognition } from '../cognition/MetaCognition';
import { reflectionEngine } from '../cognition/ReflectionEngine';
import { criticEngine } from '../cognition/CriticEngine';
import { memoryManager } from '../memory/MemoryManager';
import { strategySelector } from '../strategies/StrategySelector';
import { BaseStrategy } from '../strategies/BaseStrategy';

export class CortexAgent {
  private static instance: CortexAgent | null = null;
  private perception: PerceptionEngine;
  private listeners: Set<AgentEventListener> = new Set();
  private isExecuting = false;

  private currentHorizon: HorizonType = 'short';
  private currentStrategy: StrategyType = 'react';

  private constructor() {
    this.perception = new PerceptionEngine();
  }

  public static getInstance(): CortexAgent {
    if (!CortexAgent.instance) {
      CortexAgent.instance = new CortexAgent();
    }
    return CortexAgent.instance;
  }

  public addEventListener(listener: AgentEventListener): void {
    this.listeners.add(listener);
  }

  public removeEventListener(listener: AgentEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(type: AgentLifecycleEvent['type'], payload: any): void {
    const event: AgentLifecycleEvent = {
      type,
      timestamp: Date.now(),
      payload,
    };
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[CortexAgent Event Error]', err);
      }
    }
  }

  public getHorizon(): HorizonType {
    return this.currentHorizon;
  }

  public getStrategy(): StrategyType {
    return this.currentStrategy;
  }

  public getIsExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * Main cognitive entrypoint
   */
  public async executeTask(userPrompt: string): Promise<{
    finalResponse: string;
    horizon: HorizonType;
    strategy: StrategyType;
    steps: ReActStep[];
    plan?: TaskPlan;
    assessment: ComplexityAssessment;
    durationMs: number;
  }> {
    if (this.isExecuting) {
      throw new Error('Cortex Agent is currently executing a task.');
    }

    const taskStartTime = performance.now();
    this.isExecuting = true;
    const stepReflections: Reflection[] = [];
    const collectedSteps: ReActStep[] = [];
    let currentPlan: TaskPlan | undefined;

    try {
      // 1. Perception & Intent Parsing
      this.emit('perceiving', { input: userPrompt });
      const parsedIntent = this.perception.parse(userPrompt);

      // 2. Memory Context Search
      const similarEpisodes = await memoryManager.episodic.findSimilar(userPrompt, 1);
      const memoryMatchScore = similarEpisodes.length > 0 ? similarEpisodes[0].score : 0.2;

      // 3. Meta-Cognition: Complexity Assessment & Strategy Selection
      const assessment = metaCognition.assessComplexity(parsedIntent, memoryMatchScore);
      this.currentHorizon = assessment.horizonClass;
      this.currentStrategy = assessment.recommendedStrategy;

      this.emit('horizon_assessed', { assessment });
      this.emit('strategy_selected', {
        horizon: this.currentHorizon,
        strategy: this.currentStrategy,
        reasoning: assessment.reasoning,
      });

      // Update Working Memory
      memoryManager.working.setActiveGoal(userPrompt);

      // 4. Instantiate and attach listeners to strategy
      let activeStrategy: BaseStrategy = strategySelector.getStrategy(this.currentStrategy);
      const strategyBridgeListener = (ev: AgentLifecycleEvent) => {
        this.emit(ev.type, ev.payload);
        if (ev.type === 'plan_updated' && ev.payload?.plan) {
          currentPlan = ev.payload.plan;
          memoryManager.working.setActivePlan(currentPlan || null);
        }
      };
      activeStrategy.addEventListener(strategyBridgeListener);

      // 5. Execution with Dynamic Horizon Monitoring
      const executionResult = await activeStrategy.execute({
        goal: userPrompt,
        onStep: (step) => {
          collectedSteps.push(step);
          memoryManager.working.addStep(step);

          // Step-level reflection
          const ref = reflectionEngine.reflectOnStep({
            step,
            goal: userPrompt,
          });
          stepReflections.push(ref);
          this.emit('reflecting', { reflection: ref });

          // ── Dynamic Horizon Switching Evaluation ──
          const switchEvaluation = metaCognition.evaluateDynamicSwitch({
            currentHorizon: this.currentHorizon,
            currentStrategy: this.currentStrategy,
            recentSteps: collectedSteps,
            totalStepsTaken: collectedSteps.length,
          });

          if (switchEvaluation.shouldSwitch && switchEvaluation.targetStrategy !== this.currentStrategy) {
            this.emit('horizon_switched', {
              previousHorizon: this.currentHorizon,
              previousStrategy: this.currentStrategy,
              newHorizon: switchEvaluation.targetHorizon,
              newStrategy: switchEvaluation.targetStrategy,
              triggerReason: switchEvaluation.triggerReason,
            });

            this.currentHorizon = switchEvaluation.targetHorizon;
            this.currentStrategy = switchEvaluation.targetStrategy;
          }
        },
      });

      // 6. Critic Pass on Output
      this.emit('critic_pass', { phase: 'verifying' });
      const criticPass = await criticEngine.evaluate({
        targetOutput: executionResult.finalResponse,
        targetType: parsedIntent.category === 'code_modification' ? 'code' : 'command_output',
        goal: userPrompt,
      });
      this.emit('critic_pass', { criticPass });

      // 7. Consolidate Learnings into Memory
      const durationMs = Math.round(performance.now() - taskStartTime);
      await memoryManager.consolidateTaskLearnings({
        taskDescription: userPrompt,
        strategy: this.currentStrategy,
        outcome: executionResult.success ? 'success' : 'partial',
        totalSteps: collectedSteps.length,
        totalDurationMs: durationMs,
        reflections: stepReflections,
        tags: [parsedIntent.category, this.currentHorizon],
      });
      this.emit('memory_updated', { totalEpisodes: await memoryManager.episodic.getAllEpisodes() });

      this.emit('completed', {
        finalResponse: executionResult.finalResponse,
        durationMs,
      });

      return {
        finalResponse: executionResult.finalResponse,
        horizon: this.currentHorizon,
        strategy: this.currentStrategy,
        steps: collectedSteps,
        plan: currentPlan,
        assessment,
        durationMs,
      };
    } catch (err: any) {
      this.emit('error', { error: err?.message || String(err) });
      throw err;
    } finally {
      this.isExecuting = false;
    }
  }
}

export const cortexAgent = CortexAgent.getInstance();
