import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { ContextRetriever } from "../retriever.ts";

describe("ContextRetriever", () => {
  let store: KnowledgeStore;
  let retriever: ContextRetriever;

  beforeEach(async () => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    retriever = new ContextRetriever(store.db);

    // Seed some content
    await store.insertChunk({
      id: "c1",
      sourceUri: "test://1",
      content: "typescript project architecture overview",
    });
    await store.insertChunk({
      id: "c2",
      sourceUri: "test://2",
      content: "python data pipeline for training",
    });
    await store.insertChunk({
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

  it("recency weighting: newer chunks score higher", async () => {
    const store2 = new KnowledgeStore({ dbPath: ":memory:" });
    const now = new Date();
    const oldDate = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();
    const newDate = new Date(now.getTime() - 1 * 3600_000).toISOString();
    await store2.insertChunk({
      id: "old1",
      sourceUri: "test://old",
      content: "javascript framework comparison guide",
      metadata: { created_at: oldDate },
    });
    await store2.insertChunk({
      id: "new1",
      sourceUri: "test://new",
      content: "javascript framework latest updates",
      metadata: { created_at: newDate },
    });
    const r = new ContextRetriever(store2.db);
    const chunks = await r.retrieve("javascript framework");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const newChunk = chunks.find((c) => c.id === "new1");
    const oldChunk = chunks.find((c) => c.id === "old1");
    expect(newChunk).toBeDefined();
    expect(oldChunk).toBeDefined();
    expect(newChunk!.score).toBeGreaterThan(oldChunk!.score);
    store2.close();
  });

  it("entity boost: chunks with matching entity mentions score higher", async () => {
    const store2 = new KnowledgeStore({ dbPath: ":memory:" });
    await store2.insertChunk({
      id: "ch1",
      sourceUri: "test://1",
      content: "advanced react patterns overview",
    });
    await store2.insertChunk({
      id: "ch2",
      sourceUri: "test://2",
      content: "advanced react hooks tutorial",
    });
    store2.insertEntity({ id: "e1", name: "React", type: "topic" });
    store2.db
      .prepare("INSERT INTO entity_mentions (id, entity_id, chunk_id) VALUES (?, ?, ?)")
      .run("em1", "e1", "ch1");
    const r = new ContextRetriever(store2.db);
    const chunks = await r.retrieve("react", ["e1"]);
    const boosted = chunks.find((c) => c.id === "ch1");
    const unboosted = chunks.find((c) => c.id === "ch2");
    expect(boosted).toBeDefined();
    expect(unboosted).toBeDefined();
    expect(boosted!.score).toBeGreaterThan(unboosted!.score);
    store2.close();
  });

  it("deduplication: duplicate content returns only one", async () => {
    const store2 = new KnowledgeStore({ dbPath: ":memory:" });
    await store2.insertChunk({
      id: "d1",
      sourceUri: "test://1",
      content: "unique dedup test content here",
    });
    await store2.insertChunk({
      id: "d2",
      sourceUri: "test://2",
      content: "unique dedup test content here",
    });
    const r = new ContextRetriever(store2.db);
    const chunks = await r.retrieve("unique dedup test");
    const contents = chunks.map((c) => c.content);
    const unique = new Set(contents);
    expect(unique.size).toBe(contents.length);
    store2.close();
  });
});
