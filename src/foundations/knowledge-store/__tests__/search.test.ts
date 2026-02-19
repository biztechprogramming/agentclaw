import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hybridSearch } from "../search.ts";
import { KnowledgeStore } from "../store.ts";

describe("Knowledge Store Search", () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
  });

  afterEach(() => {
    store.close();
  });

  it("FTS search returns ranked results", async () => {
    await store.insertChunk({
      id: "c1",
      sourceUri: "t://1",
      content: "deep learning neural networks",
    });
    await store.insertChunk({ id: "c2", sourceUri: "t://2", content: "cooking recipes pasta" });
    await store.insertChunk({
      id: "c3",
      sourceUri: "t://3",
      content: "deep learning transformers attention",
    });
    const results = await hybridSearch(store.db, { query: "deep learning" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.content.includes("deep learning"))).toBe(true);
  });

  it("graph search via entity_mentions join", async () => {
    store.insertEntity({
      id: "e1",
      name: "TensorFlow",
      type: "topic",
      description: "ML framework",
    });
    await store.insertChunk({
      id: "c1",
      sourceUri: "t://1",
      content: "using the framework for training",
    });
    store.db
      .prepare("INSERT INTO entity_mentions (id, entity_id, chunk_id) VALUES (?, ?, ?)")
      .run("em1", "e1", "c1");
    const results = await hybridSearch(store.db, { query: "TensorFlow" });
    expect(results.some((r) => r.id === "c1")).toBe(true);
  });

  it("empty query returns empty or does not crash", async () => {
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: "test" });
    const results = await hybridSearch(store.db, { query: "" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("minScore filtering works", async () => {
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: "alpha beta gamma" });
    const all = await hybridSearch(store.db, { query: "alpha", minScore: 0 });
    const filtered = await hybridSearch(store.db, { query: "alpha", minScore: 999 });
    expect(all.length).toBeGreaterThanOrEqual(filtered.length);
    expect(filtered).toHaveLength(0);
  });
});
