/**
 * Lightweight in-memory Vector Store with Cosine Similarity
 * and text feature hashing vectorizer.
 */

export interface VectorSearchResult<T = any> {
  id: string;
  score: number; // 0..1 cosine similarity
  metadata: T;
}

export class VectorStore<T = any> {
  private dimensions: number;
  private vectors: Map<string, number[]> = new Map();
  private metadata: Map<string, T> = new Map();

  constructor(dimensions = 128) {
    this.dimensions = dimensions;
  }

  public set(id: string, vector: number[], meta: T): void {
    const normalized = this.normalize(vector);
    this.vectors.set(id, normalized);
    this.metadata.set(id, meta);
  }

  public get(id: string): { vector: number[]; metadata: T } | undefined {
    const v = this.vectors.get(id);
    const m = this.metadata.get(id);
    if (!v || !m) return undefined;
    return { vector: v, metadata: m };
  }

  public delete(id: string): boolean {
    this.metadata.delete(id);
    return this.vectors.delete(id);
  }

  public clear(): void {
    this.vectors.clear();
    this.metadata.clear();
  }

  public size(): number {
    return this.vectors.size;
  }

  public search(queryVector: number[], topK = 5, minScore = 0.15): VectorSearchResult<T>[] {
    const normalizedQuery = this.normalize(queryVector);
    const results: VectorSearchResult<T>[] = [];

    for (const [id, vec] of this.vectors.entries()) {
      const score = this.cosineSimilarity(normalizedQuery, vec);
      if (score >= minScore) {
        results.push({
          id,
          score,
          metadata: this.metadata.get(id)!,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  private normalize(v: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < v.length; i++) {
      sumSq += v[i] * v[i];
    }
    const norm = Math.sqrt(sumSq) || 1e-10;
    return v.map((x) => x / norm);
  }

  /**
   * Deterministic semantic feature hashing embedding generator for strings
   * Maps arbitrary text into an N-dimensional normalized vector.
   */
  public static textToVector(text: string, dimensions = 128): number[] {
    const vec = new Array(dimensions).fill(0);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    for (const word of words) {
      let hash = 5381;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 33) ^ word.charCodeAt(i);
      }
      const index = Math.abs(hash) % dimensions;
      const weight = Math.log(1 + word.length);
      vec[index] += weight;
    }

    // Also include character 3-grams for morphology and subword matching
    for (let i = 0; i < text.length - 2; i++) {
      const trigram = text.slice(i, i + 3).toLowerCase();
      let h = 0;
      for (let j = 0; j < 3; j++) {
        h = (h << 5) - h + trigram.charCodeAt(j);
      }
      const idx = Math.abs(h) % dimensions;
      vec[idx] += 0.5;
    }

    // Normalize
    let sumSq = 0;
    for (let i = 0; i < dimensions; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq) || 1e-10;
    return vec.map((x) => x / norm);
  }
}
