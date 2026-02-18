import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { ContextRetriever } from "../retriever.ts";
import { SessionSummarizer } from "../summarizer.ts";
import { ContextWindowManager } from "../window-manager.ts";

describe("ContextWindowManager", () => {
  let store: KnowledgeStore;
  let manager: ContextWindowManager;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    const retriever = new ContextRetriever(store.db);
    const summarizer = new SessionSummarizer(store.db);
    manager = new ContextWindowManager(retriever, summarizer, { tokenBudget: 2000 });
  });

  it("builds a context window with recent turns", async () => {
    const turns = [
      { role: "user", content: "Hello there" },
      { role: "assistant", content: "Hi! How can I help?" },
    ];
    const window = await manager.buildWindow("sess-1", turns, "Hello");
    expect(window.sessionId).toBe("sess-1");
    expect(window.chunks.some((c) => c.source === "recent_turn")).toBe(true);
    expect(window.totalTokens).toBeGreaterThan(0);
    expect(window.totalTokens).toBeLessThanOrEqual(2000);
  });

  it("flags compaction when turns exceed threshold", async () => {
    const turns = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Turn ${i}`,
    }));
    const window = await manager.buildWindow("sess-2", turns, "test");
    expect(window.needsCompaction).toBe(true);
  });

  it("does not flag compaction for few turns", async () => {
    const turns = [{ role: "user", content: "hi" }];
    const window = await manager.buildWindow("sess-3", turns, "hi");
    expect(window.needsCompaction).toBe(false);
  });

  it("includes summary if available", async () => {
    const summarizer = new SessionSummarizer(store.db);
    await summarizer.summarize("sess-4", [{ role: "user", content: "test content" }]);

    const retriever = new ContextRetriever(store.db);
    const mgr = new ContextWindowManager(retriever, summarizer);
    const window = await mgr.buildWindow("sess-4", [], "query");
    expect(window.chunks.some((c) => c.source === "summary")).toBe(true);
  });

  it("respects token budget", async () => {
    const mgr = new ContextWindowManager(
      new ContextRetriever(store.db),
      new SessionSummarizer(store.db),
      { tokenBudget: 100, recentTurnsFraction: 0.5, compactionThreshold: 20 },
    );
    const turns = Array.from({ length: 10 }, () => ({
      role: "user",
      content: "A".repeat(200),
    }));
    const window = await mgr.buildWindow("sess-5", turns, "test");
    expect(window.totalTokens).toBeLessThanOrEqual(100);
  });
});
