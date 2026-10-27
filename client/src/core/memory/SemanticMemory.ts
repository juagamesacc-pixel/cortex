import { cortexDb, DBSemanticFact } from './db';
import { VectorStore } from './VectorStore';

export class SemanticMemory {
  private vectorStore: VectorStore<DBSemanticFact> = new VectorStore<DBSemanticFact>(128);
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const all = await cortexDb.semanticFacts.toArray();
      for (const fact of all) {
        this.vectorStore.set(fact.id, fact.embedding, fact);
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  public async storeFact(
    content: string,
    domain: string = 'general',
    confidence = 0.85,
    source: 'extracted' | 'user' | 'observed' = 'extracted'
  ): Promise<string> {
    await this.init();
    const id = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const embedding = VectorStore.textToVector(`${domain} ${content}`);

    const fact: DBSemanticFact = {
      id,
      content,
      domain,
      confidence,
      source,
      accessCount: 0,
      lastAccessed: Date.now(),
      embedding,
      createdAt: Date.now(),
    };

    this.vectorStore.set(id, embedding, fact);
    try {
      await cortexDb.semanticFacts.put(fact);
    } catch (e) {
      console.warn('[SemanticMemory] Persistence error:', e);
    }

    return id;
  }

  public async query(queryText: string, topK = 5): Promise<Array<{ fact: DBSemanticFact; score: number }>> {
    await this.init();
    const qVec = VectorStore.textToVector(queryText);
    const results = this.vectorStore.search(qVec, topK, 0.22);

    // Update access count and timestamp
    for (const r of results) {
      r.metadata.accessCount++;
      r.metadata.lastAccessed = Date.now();
      try {
        await cortexDb.semanticFacts.update(r.metadata.id, {
          accessCount: r.metadata.accessCount,
          lastAccessed: r.metadata.lastAccessed,
        });
      } catch {
        // Non-blocking
      }
    }

    return results.map((r) => ({
      fact: r.metadata,
      score: r.score,
    }));
  }

  public async getAllFacts(): Promise<DBSemanticFact[]> {
    await this.init();
    try {
      return await cortexDb.semanticFacts.toArray();
    } catch {
      return [];
    }
  }
}
