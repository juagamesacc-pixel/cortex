import { ACS_CONFIG } from '../agent/constants';
import { ReActStep, TaskPlan } from '../agent/types';

export interface WorkingContextSnapshot {
  activeGoal: string;
  planSummary?: string;
  recentSteps: ReActStep[];
  scratchpad: Record<string, any>;
  environmentFacts: string[];
}

export class WorkingMemory {
  private activeGoal: string = '';
  private activePlan: TaskPlan | null = null;
  private recentSteps: ReActStep[] = [];
  private scratchpad: Map<string, any> = new Map();
  private environmentFacts: Set<string> = new Set();

  public setActiveGoal(goal: string): void {
    this.activeGoal = goal;
  }

  public getActiveGoal(): string {
    return this.activeGoal;
  }

  public setActivePlan(plan: TaskPlan | null): void {
    this.activePlan = plan;
  }

  public getActivePlan(): TaskPlan | null {
    return this.activePlan;
  }

  public addStep(step: ReActStep): void {
    this.recentSteps.push(step);
    if (this.recentSteps.length > ACS_CONFIG.WORKING_MEMORY_WINDOW_SIZE) {
      this.recentSteps.shift();
    }
  }

  public getRecentSteps(count?: number): ReActStep[] {
    if (!count) return [...this.recentSteps];
    return this.recentSteps.slice(-count);
  }

  public setNote(key: string, value: any): void {
    this.scratchpad.set(key, value);
  }

  public getNote<T = any>(key: string): T | undefined {
    return this.scratchpad.get(key);
  }

  public removeNote(key: string): boolean {
    return this.scratchpad.delete(key);
  }

  public addEnvironmentFact(fact: string): void {
    this.environmentFacts.add(fact);
  }

  public getEnvironmentFacts(): string[] {
    return Array.from(this.environmentFacts);
  }

  public clear(): void {
    this.activeGoal = '';
    this.activePlan = null;
    this.recentSteps = [];
    this.scratchpad.clear();
    this.environmentFacts.clear();
  }

  public getSnapshot(): WorkingContextSnapshot {
    return {
      activeGoal: this.activeGoal,
      planSummary: this.activePlan ? `Plan: ${this.activePlan.goal} (${Object.keys(this.activePlan.nodes).length} subtasks)` : undefined,
      recentSteps: [...this.recentSteps],
      scratchpad: Object.fromEntries(this.scratchpad.entries()),
      environmentFacts: Array.from(this.environmentFacts),
    };
  }
}
