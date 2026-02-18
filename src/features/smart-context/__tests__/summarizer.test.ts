import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { SessionSummarizer } from "../summarizer.ts";

describe("SessionSummarizer", () => {
  let store: KnowledgeStore;
  let summarizer: SessionSummarizer;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    summarizer = new SessionSummarizer(store.db);
  });

  afterEach(() => {
    store.close();
  });

  it("stub summarizer truncates long content", async () => {
    const longTurns = Array.from({ length: 20 }, (_, i) => ({
      role: "user",
      content: `Message number ${i} with some extra padding text to make it longer`,
    }));
    const result = await summarizer.summarize("s1", longTurns);
    expect(result.summary.length).toBeLessThanOrEqual(503); // 500 + "..."
    expect(result.summary.endsWith("...")).toBe(true);
  });

  it("stores summary in session_summaries table", async () => {
    await summarizer.summarize("s1", [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ]);
    const row = store.db
      .prepare("SELECT * FROM session_summaries WHERE session_id = ?")
      .get("s1") as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.summary).toContain("hello");
  });

  it("getLatestSummary returns most recent", async () => {
    await summarizer.summarize("s1", [{ role: "user", content: "first" }]);
    // Force different created_at by updating the first row to be older
    store.db
      .prepare(
        "UPDATE session_summaries SET created_at = datetime('now', '-1 hour') WHERE session_id = 's1'",
      )
      .run();
    await summarizer.summarize("s1", [{ role: "user", content: "second" }]);
    const latest = summarizer.getLatestSummary("s1");
    expect(latest).toBeDefined();
    expect(latest!.summary).toContain("second");
  });

  it("getLatestSummary returns undefined for unknown session", () => {
    expect(summarizer.getLatestSummary("nonexistent")).toBeUndefined();
  });

  it("returns correct tokensSaved and turnsConsumed", async () => {
    const result = await summarizer.summarize("s1", [
      { role: "user", content: "hello world" },
      { role: "assistant", content: "greetings" },
    ]);
    expect(result.turnsConsumed).toBe(2);
    expect(result.sessionId).toBe("s1");
    expect(result.summaryId).toBeDefined();
    expect(result.keyTopics.length).toBeGreaterThan(0);
  });
});
