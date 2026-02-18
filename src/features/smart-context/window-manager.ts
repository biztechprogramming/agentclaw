/**
 * ContextWindowManager — manages what goes into the agent context window.
 * @module features/smart-context/window-manager
 */

import type { ContextRetriever } from "./retriever.ts";
import type { SessionSummarizer } from "./summarizer.ts";
import type { ContextChunk, ContextWindow } from "./types.ts";

/** Rough token estimate */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface WindowManagerOptions {
  /** Total token budget for the context window */
  tokenBudget: number;
  /** Fraction of budget reserved for recent turns */
  recentTurnsFraction: number;
  /** Number of turns before compaction is triggered */
  compactionThreshold: number;
}

const DEFAULT_OPTIONS: WindowManagerOptions = {
  tokenBudget: 8000,
  recentTurnsFraction: 0.4,
  compactionThreshold: 20,
};

/**
 * ContextWindowManager decides what to include in the context window:
 * recent turns, retrieved context, entity context, and summaries.
 */
export class ContextWindowManager {
  private readonly options: WindowManagerOptions;

  constructor(
    private readonly retriever: ContextRetriever,
    private readonly summarizer: SessionSummarizer,
    options?: Partial<WindowManagerOptions>,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build a context window for a session given recent turns and the current query.
   */
  async buildWindow(
    sessionId: string,
    recentTurns: Array<{ role: string; content: string }>,
    currentQuery: string,
    entityIds?: string[],
  ): Promise<ContextWindow> {
    const chunks: ContextChunk[] = [];
    let totalTokens = 0;
    const recentBudget = Math.floor(this.options.tokenBudget * this.options.recentTurnsFraction);
    const _retrievalBudget = this.options.tokenBudget - recentBudget;

    // 1. Include session summary if available
    const summaryData = this.summarizer.getLatestSummary(sessionId);
    if (summaryData) {
      const tokens = estimateTokens(summaryData.summary);
      chunks.push({
        id: `summary-${sessionId}`,
        content: summaryData.summary,
        source: "summary",
        score: 1.0,
        tokenCount: tokens,
      });
      totalTokens += tokens;
    }

    // 2. Include recent turns (most recent first, within budget)
    for (let i = recentTurns.length - 1; i >= 0; i--) {
      const turn = recentTurns[i];
      const text = `${turn.role}: ${turn.content}`;
      const tokens = estimateTokens(text);
      if (
        totalTokens + tokens >
        recentBudget + (summaryData ? estimateTokens(summaryData.summary) : 0)
      ) {
        break;
      }
      chunks.push({
        id: `turn-${i}`,
        content: text,
        source: "recent_turn",
        score: 0.9 + i * 0.001, // slight ordering preference
        tokenCount: tokens,
      });
      totalTokens += tokens;
    }

    // 3. Retrieve relevant context via RAG
    const retrieved = await this.retriever.retrieve(currentQuery, entityIds);
    for (const chunk of retrieved) {
      if (totalTokens + chunk.tokenCount > this.options.tokenBudget) {
        continue;
      }
      chunks.push(chunk);
      totalTokens += chunk.tokenCount;
    }

    const needsCompaction = recentTurns.length >= this.options.compactionThreshold;

    return {
      sessionId,
      chunks,
      totalTokens,
      budgetTokens: this.options.tokenBudget,
      needsCompaction,
    };
  }
}
