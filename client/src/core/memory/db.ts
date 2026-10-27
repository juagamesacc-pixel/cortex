import Dexie, { Table } from 'dexie';
import { Reflection } from '../agent/types';

export interface DBEpisode {
  id: string;
  taskDescription: string;
  strategy: 'react' | 'htn' | 'lats';
  outcome: 'success' | 'partial' | 'failure';
  totalSteps: number;
  totalDurationMs: number;
  reflections: Reflection[];
  lessonsLearned: string[];
  tags: string[];
  embedding: number[];
  createdAt: number;
}

export interface DBSemanticFact {
  id: string;
  content: string;
  domain: string;
  confidence: number;
  source: 'extracted' | 'user' | 'observed';
  accessCount: number;
  lastAccessed: number;
  embedding: number[];
  createdAt: number;
}

export interface DBProcedure {
  id: string;
  name: string;
  description: string;
  triggerKeywords: string[];
  stepsJson: string;
  parametersJson: string;
  successRate: number;
  timesExecuted: number;
  lastUsed: number;
  createdAt: number;
}

export interface DBWorkingItem {
  id: string;
  category: 'trace' | 'scratchpad' | 'goal';
  key: string;
  valueJson: string;
  timestamp: number;
}

export class CortexDatabase extends Dexie {
  episodes!: Table<DBEpisode, string>;
  semanticFacts!: Table<DBSemanticFact, string>;
  procedures!: Table<DBProcedure, string>;
  workingMemory!: Table<DBWorkingItem, string>;

  constructor() {
    super('CortexAgentDB');
    this.version(1).stores({
      episodes: 'id, outcome, strategy, createdAt, *tags',
      semanticFacts: 'id, domain, confidence, lastAccessed',
      procedures: 'id, name, successRate, lastUsed, *triggerKeywords',
      workingMemory: 'id, category, key, timestamp',
    });
  }
}

export const cortexDb = new CortexDatabase();
