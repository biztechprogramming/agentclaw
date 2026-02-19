/**
 * Voyage AI embedding provider — uses the Voyage REST API for real embeddings.
 * @module foundations/knowledge-store/voyage-embeddings
 */

import type { IEmbeddingProvider } from "./embeddings.ts";

/** Configuration options for VoyageEmbeddingProvider */
export interface VoyageEmbeddingOptions {
  /** Voyage model name (default: "voyage-4-large") */
  model?: string;
  /** API key override (default: reads VOYAGE_API_KEY env var) */
  apiKey?: string;
  /** Embedding dimensions (default: 1024) */
  dimensions?: number;
  /** API base URL (default: "https://api.voyageai.com/v1") */
  baseUrl?: string;
}

/**
 * VoyageEmbeddingProvider calls the Voyage AI REST API to produce real embeddings.
 * Uses `input_type: "document"` for indexing and `input_type: "query"` for search.
 */
export class VoyageEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: VoyageEmbeddingOptions = {}) {
    this.model = options.model ?? "voyage-4-large";
    this.dimensions = options.dimensions ?? 1024;
    this.baseUrl = options.baseUrl ?? "https://api.voyageai.com/v1";
    const key = options.apiKey ?? process.env.VOYAGE_API_KEY;
    if (!key) {
      throw new Error(
        "Voyage API key required: pass apiKey in options or set VOYAGE_API_KEY env var",
      );
    }
    this.apiKey = key;
  }

  /** Embed text for document indexing (input_type: "document") */
  async embed(text: string): Promise<Float32Array> {
    return this.callApi(text, "document");
  }

  /** Embed text for query/search (input_type: "query") */
  async embedQuery(text: string): Promise<Float32Array> {
    return this.callApi(text, "query");
  }

  /** Call the Voyage embeddings API */
  private async callApi(text: string, inputType: "document" | "query"): Promise<Float32Array> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: this.model,
        input_type: inputType,
        output_dimension: this.dimensions,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Voyage API error (${response.status}): ${body || response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };

    const embedding = json.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Voyage API returned unexpected response: missing embedding data");
    }

    return new Float32Array(embedding);
  }
}
