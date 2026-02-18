/**
 * Types for Smart Context Management.
 * @module features/smart-context/types
 */

/** A chunk of context retrieved for inclusion in agent context window */
export interface ContextChunk {
  id: string;
  content: string;
  source: "recent_turn" | "retrieval" | "entity" | "summary";
  score: number;
  tokenCount: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/** The assembled context window for a session */
export interface ContextWindow {
  sessionId: string;
  chunks: ContextChunk[];
  totalTokens: number;
  budgetTokens: number;
  /** Whether compaction is recommended */
  needsCompaction: boolean;
}

/** Strategy for context retrieval */
export interface RetrievalStrategy {
  /** Weight for recency (0-1) */
  recencyWeight: number;
  /** Weight for relevance score (0-1) */
  relevanceWeight: number;
  /** Weight for entity boosting (0-1) */
  entityBoostWeight: number;
  /** Maximum token budget for retrieved context */
  maxRetrievalTokens: number;
}

/** Result of summarizing conversation turns */
export interface SummarizationResult {
  summaryId: string;
  sessionId: string;
  summary: string;
  keyTopics: string[];
  turnsConsumed: number;
  tokensSaved: number;
}

/**
 * Pluggable LLM interface for summarization.
 */
export interface ISummarizationProvider {
  summarize(
    turns: Array<{ role: string; content: string }>,
  ): Promise<{ summary: string; keyTopics: string[] }>;
}
