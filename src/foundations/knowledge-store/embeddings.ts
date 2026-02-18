/**
 * Embedding interface and stub implementation.
 * @module foundations/knowledge-store/embeddings
 */

/** Interface for embedding providers */
export interface IEmbeddingProvider {
  /** Generate embedding vector for text */
  embed(text: string): Promise<Float32Array>;
  /** Dimensionality of output vectors */
  readonly dimensions: number;
}

/** Stub that returns zero vectors — swap in a real provider later */
export class StubEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  async embed(_text: string): Promise<Float32Array> {
    return new Float32Array(this.dimensions);
  }
}
