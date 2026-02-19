/**
 * ContextRetriever — RAG-based retrieval of relevant context chunks.
 * @module features/smart-context/retriever
 */

import type Database from "better-sqlite3";
import { hybridSearch } from "../../foundations/knowledge-store/search.ts";
import type { ContextChunk, RetrievalStrategy } from "./types.ts";

/** Rough token estimate: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const DEFAULT_STRATEGY: RetrievalStrategy = {
  recencyWeight: 0.3,
  relevanceWeight: 0.5,
  entityBoostWeight: 0.2,
  maxRetrievalTokens: 4000,
};

/**
 * ContextRetriever retrieves relevant past context from the Knowledge Store
 * using hybrid search, applies recency weighting and entity boosting,
 * and returns ranked chunks that fit within a token budget.
 */
export class ContextRetriever {
  constructor(
    private readonly db: Database.Database,
    private readonly strategy: RetrievalStrategy = DEFAULT_STRATEGY,
  ) {}

  /** Retrieve relevant context for a query, fitting within token budget */
  async retrieve(query: string, entityIds?: string[]): Promise<ContextChunk[]> {
    const rawResults = await hybridSearch(this.db, {
      query,
      limit: 50,
      minScore: 0,
    });

    // Score and convert to ContextChunks
    const now = Date.now();
    const chunks: ContextChunk[] = rawResults.map((r) => {
      let score = r.score * this.strategy.relevanceWeight;

      // Recency boost
      const meta = r.metadata ?? {};
      const createdAt = meta.created_at as string | undefined;
      if (createdAt) {
        const ageHours = (now - new Date(createdAt).getTime()) / 3_600_000;
        const recencyScore = Math.max(0, 1 - ageHours / 720); // decay over 30 days
        score += recencyScore * this.strategy.recencyWeight;
      }

      // Entity boost
      if (entityIds?.length) {
        try {
          const mentions = this.db
            .prepare("SELECT entity_id FROM entity_mentions WHERE chunk_id = ?")
            .all(r.id) as Array<{ entity_id: string }>;
          const entitySet = new Set(entityIds);
          if (mentions.some((m) => entitySet.has(m.entity_id))) {
            score += this.strategy.entityBoostWeight;
          }
        } catch {
          // skip
        }
      }

      return {
        id: r.id,
        content: r.content,
        source: "retrieval" as const,
        score,
        tokenCount: estimateTokens(r.content),
        metadata: r.metadata,
      };
    });

    // Sort by score descending
    chunks.sort((a, b) => b.score - a.score);

    // Fit within token budget
    const result: ContextChunk[] = [];
    let totalTokens = 0;
    for (const chunk of chunks) {
      if (totalTokens + chunk.tokenCount > this.strategy.maxRetrievalTokens) {
        continue;
      }
      result.push(chunk);
      totalTokens += chunk.tokenCount;
    }

    // Deduplicate by content hash
    const seen = new Set<string>();
    return result.filter((c) => {
      const key = c.content.slice(0, 100);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
