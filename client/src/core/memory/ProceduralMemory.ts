import { cortexDb, DBProcedure } from './db';

export interface ProcedureStepDefinition {
  tool: string;
  argsTemplate: Record<string, string>;
  expectedOutcome?: string;
  onFailure: 'retry' | 'skip' | 'abort';
}

export class ProceduralMemory {
  private cache: Map<string, DBProcedure> = new Map();
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const all = await cortexDb.procedures.toArray();
      for (const p of all) {
        this.cache.set(p.id, p);
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  public async compileProcedure(params: {
    name: string;
    description: string;
    triggerKeywords: string[];
    steps: ProcedureStepDefinition[];
    parameters?: Record<string, string>;
  }): Promise<string> {
    await this.init();
    const id = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const proc: DBProcedure = {
      id,
      name: params.name,
      description: params.description,
      triggerKeywords: params.triggerKeywords.map((k) => k.toLowerCase()),
      stepsJson: JSON.stringify(params.steps),
      parametersJson: JSON.stringify(params.parameters || {}),
      successRate: 1.0,
      timesExecuted: 1,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };

    this.cache.set(id, proc);
    try {
      await cortexDb.procedures.put(proc);
    } catch (e) {
      console.warn('[ProceduralMemory] Save error:', e);
    }

    return id;
  }

  public async findMatching(taskDescription: string): Promise<DBProcedure[]> {
    await this.init();
    const desc = taskDescription.toLowerCase();
    const matched: DBProcedure[] = [];

    for (const proc of this.cache.values()) {
      const match = proc.triggerKeywords.some((kw) => desc.includes(kw));
      if (match) {
        matched.push(proc);
      }
    }

    return matched.sort((a, b) => b.successRate - a.successRate);
  }

  public async getAllProcedures(): Promise<DBProcedure[]> {
    await this.init();
    return Array.from(this.cache.values());
  }
}
