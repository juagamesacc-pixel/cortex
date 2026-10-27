import { cortexDb, DBEpisode } from './db';
import { VectorStore } from './VectorStore';
import { Reflection } from '../agent/types';

export class EpisodicMemory {
  private vectorStore: VectorStore<DBEpisode> = new VectorStore<DBEpisode>(128);
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const all = await cortexDb.episodes.toArray();
      for (const ep of all) {
        this.vectorStore.set(ep.id, ep.embedding, ep);
      }
      this.initialized = true;
    } catch (e) {
      console.warn('[EpisodicMemory] IndexedDB init warning:', e);
      this.initialized = true;
    }
  }

  public async recordEpisode(params: {
    taskDescription: string;
    strategy: 'react' | 'htn' | 'lats';
    outcome: 'success' | 'partial' | 'failure';
    totalSteps: number;
    totalDurationMs: number;
    reflections: Reflection[];
    lessonsLearned: string[];
    tags: string[];
  }): Promise<string> {
    await this.init();
    const id = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const embedding = VectorStore.textToVector(
      `${params.taskDescription} ${params.tags.join(' ')} ${params.lessonsLearned.join(' ')}`
    );

    const episode: DBEpisode = {
      id,
      taskDescription: params.taskDescription,
      strategy: params.strategy,
      outcome: params.outcome,
      totalSteps: params.totalSteps,
      totalDurationMs: params.totalDurationMs,
      reflections: params.reflections,
      lessonsLearned: params.lessonsLearned,
      tags: params.tags,
      embedding,
      createdAt: Date.now(),
    };

    this.vectorStore.set(id, embedding, episode);
    try {
      await cortexDb.episodes.put(episode);
    } catch (err) {
      console.warn('[EpisodicMemory] Failed persisting episode to IndexedDB:', err);
    }

    return id;
  }

  public async findSimilar(query: string, topK = 4): Promise<Array<{ episode: DBEpisode; score: number }>> {
    await this.init();
    const qVec = VectorStore.textToVector(query);
    const results = this.vectorStore.search(qVec, topK, 0.2);
    return results.map((r) => ({
      episode: r.metadata,
      score: r.score,
    }));
  }

  public async getAllEpisodes(): Promise<DBEpisode[]> {
    await this.init();
    try {
      return await cortexDb.episodes.orderBy('createdAt').reverse().toArray();
    } catch {
      return [];
    }
  }
}
