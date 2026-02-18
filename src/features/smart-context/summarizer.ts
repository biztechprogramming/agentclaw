/**
 * SessionSummarizer — summarizes conversation turns into compact representations.
 * @module features/smart-context/summarizer
 */

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { ISummarizationProvider, SummarizationResult } from "./types.ts";

/** Stub summarizer: just truncates turns */
class StubSummarizationProvider implements ISummarizationProvider {
  async summarize(
    turns: Array<{ role: string; content: string }>,
  ): Promise<{ summary: string; keyTopics: string[] }> {
    const combined = turns.map((t) => `${t.role}: ${t.content}`).join("\n");
    const summary = combined.length > 500 ? combined.slice(0, 500) + "..." : combined;
    // Extract simple "topics" from first words of each turn
    const keyTopics = turns
      .map((t) => t.content.split(/\s+/).slice(0, 3).join(" "))
      .filter((t) => t.length > 2)
      .slice(0, 5);
    return { summary, keyTopics };
  }
}

/**
 * SessionSummarizer summarizes conversation turns and stores them
 * in the session_summaries table.
 */
export class SessionSummarizer {
  private readonly provider: ISummarizationProvider;

  constructor(
    private readonly db: Database.Database,
    provider?: ISummarizationProvider,
  ) {
    this.provider = provider ?? new StubSummarizationProvider();
  }

  /** Summarize turns and store the summary */
  async summarize(
    sessionId: string,
    turns: Array<{ role: string; content: string }>,
    channel?: string,
  ): Promise<SummarizationResult> {
    const originalTokens = turns.reduce((sum, t) => sum + Math.ceil(t.content.length / 4), 0);
    const { summary, keyTopics } = await this.provider.summarize(turns);
    const summaryTokens = Math.ceil(summary.length / 4);

    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO session_summaries (id, session_id, channel, summary, key_topics, metadata) VALUES (?, ?, ?, ?, ?, '{}')`,
      )
      .run(id, sessionId, channel ?? null, summary, JSON.stringify(keyTopics));

    return {
      summaryId: id,
      sessionId,
      summary,
      keyTopics,
      turnsConsumed: turns.length,
      tokensSaved: originalTokens - summaryTokens,
    };
  }

  /** Get the latest summary for a session */
  getLatestSummary(sessionId: string): { summary: string; keyTopics: string[] } | undefined {
    const row = this.db
      .prepare(
        "SELECT summary, key_topics FROM session_summaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(sessionId) as { summary: string; key_topics: string } | undefined;
    if (!row) {
      return undefined;
    }
    return { summary: row.summary, keyTopics: JSON.parse(row.key_topics) };
  }
}
