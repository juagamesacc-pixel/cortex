import { WorkingMemory } from './WorkingMemory';
import { EpisodicMemory } from './EpisodicMemory';
import { SemanticMemory } from './SemanticMemory';
import { ProceduralMemory, ProcedureStepDefinition } from './ProceduralMemory';
import { DBEpisode, DBSemanticFact, DBProcedure } from './db';
import { Reflection } from '../agent/types';

export class MemoryManager {
  private static instance: MemoryManager | null = null;

  public readonly working: WorkingMemory;
  public readonly episodic: EpisodicMemory;
  public readonly semantic: SemanticMemory;
  public readonly procedural: ProceduralMemory;

  private constructor() {
    this.working = new WorkingMemory();
    this.episodic = new EpisodicMemory();
    this.semantic = new SemanticMemory();
    this.procedural = new ProceduralMemory();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public async initialize(): Promise<void> {
    await Promise.all([
      this.episodic.init(),
      this.semantic.init(),
      this.procedural.init(),
    ]);
  }

  /**
   * Automatically consolidates learnings from a finished task
   */
  public async consolidateTaskLearnings(params: {
    taskDescription: string;
    strategy: 'react' | 'htn' | 'lats';
    outcome: 'success' | 'partial' | 'failure';
    totalSteps: number;
    totalDurationMs: number;
    reflections: Reflection[];
    tags: string[];
    suggestedProcedure?: {
      name: string;
      description: string;
      steps: ProcedureStepDefinition[];
    };
  }): Promise<void> {
    const lessons: string[] = [];
    for (const r of params.reflections) {
      lessons.push(...r.lessonsLearned);
    }

    // 1. Record episode
    await this.episodic.recordEpisode({
      taskDescription: params.taskDescription,
      strategy: params.strategy,
      outcome: params.outcome,
      totalSteps: params.totalSteps,
      totalDurationMs: params.totalDurationMs,
      reflections: params.reflections,
      lessonsLearned: lessons,
      tags: params.tags,
    });

    // 2. Extract facts from lessons into semantic memory
    for (const lesson of lessons) {
      if (lesson.length > 10) {
        await this.semantic.storeFact(lesson, 'task-reflection', 0.82, 'extracted');
      }
    }

    // 3. Compile procedure if suggested and successful
    if (params.outcome === 'success' && params.suggestedProcedure) {
      const keywords = params.taskDescription
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      await this.procedural.compileProcedure({
        name: params.suggestedProcedure.name,
        description: params.suggestedProcedure.description,
        triggerKeywords: keywords,
        steps: params.suggestedProcedure.steps,
      });
    }
  }

  /**
   * Assembles relevant memory context for the LLM prompt
   */
  public async assemblePromptContext(query: string): Promise<string> {
    await this.initialize();

    const [similarEpisodes, semanticFacts, matchedProcedures] = await Promise.all([
      this.episodic.findSimilar(query, 2),
      this.semantic.query(query, 3),
      this.procedural.findMatching(query),
    ]);

    const sections: string[] = [];

    if (semanticFacts.length > 0) {
      const factLines = semanticFacts.map((f) => `- [${f.fact.domain}] ${f.fact.content}`);
      sections.push(`### Relevant Knowledge & Facts:\n${factLines.join('\n')}`);
    }

    if (similarEpisodes.length > 0) {
      const epLines = similarEpisodes.map((e) => {
        const ep = e.episode;
        return `- Task: "${ep.taskDescription}" (Outcome: ${ep.outcome})\n  Lessons: ${ep.lessonsLearned.slice(0, 2).join('; ')}`;
      });
      sections.push(`### Past Similar Task Trajectories:\n${epLines.join('\n')}`);
    }

    if (matchedProcedures.length > 0) {
      const p = matchedProcedures[0];
      sections.push(
        `### Known Reusable Procedure:\n- Name: "${p.name}" (Success Rate: ${Math.round(p.successRate * 100)}%)\n  Desc: ${p.description}`
      );
    }

    const working = this.working.getSnapshot();
    if (working.environmentFacts.length > 0) {
      sections.push(`### Current Environment State:\n${working.environmentFacts.join('\n')}`);
    }

    return sections.join('\n\n');
  }
}

export const memoryManager = MemoryManager.getInstance();
