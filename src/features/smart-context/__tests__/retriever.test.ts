import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { ContextRetriever } from "../retriever.ts";

describe("ContextRetriever", () => {
  let store: KnowledgeStore;
  let retriever: ContextRetriever;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    retriever = new ContextRetriever(store.db);

    // Seed some content
    store.insertChunk({
      id: "c1",
      sourceUri: "test://1",
      content: "typescript project architecture overview",
    });
    store.insertChunk({
      id: "c2",
      sourceUri: "test://2",
      content: "python data pipeline for training",
    });
    store.insertChunk({
      id: "c3",
      sourceUri: "test://3",
      content: "meeting notes about typescript refactoring",
    });
  });

  it("retrieves relevant chunks for a query", async () => {
    const chunks = await retriever.retrieve("typescript");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.content.includes("typescript"))).toBe(true);
  });

  it("returns chunks with scores", async () => {
    const chunks = await retriever.retrieve("typescript");
    for (const chunk of chunks) {
      expect(chunk.score).toBeGreaterThan(0);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  it("respects token budget", async () => {
    const retrieverSmall = new ContextRetriever(store.db, {
      recencyWeight: 0.3,
      relevanceWeight: 0.5,
      entityBoostWeight: 0.2,
      maxRetrievalTokens: 20, // very small budget
    });
    const chunks = await retrieverSmall.retrieve("typescript");
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    expect(totalTokens).toBeLessThanOrEqual(20);
  });

  it("returns empty for unmatched query", async () => {
    const chunks = await retriever.retrieve("quantum_physics_nonexistent");
    expect(chunks).toHaveLength(0);
  });
});
