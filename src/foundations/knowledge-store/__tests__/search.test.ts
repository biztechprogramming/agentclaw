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

  it("FTS search returns ranked results", () => {
    store.insertChunk({ id: "c1", sourceUri: "t://1", content: "deep learning neural networks" });
    store.insertChunk({ id: "c2", sourceUri: "t://2", content: "cooking recipes pasta" });
    store.insertChunk({
      id: "c3",
      sourceUri: "t://3",
      content: "deep learning transformers attention",
    });
    const results = hybridSearch(store.db, { query: "deep learning" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.content.includes("deep learning"))).toBe(true);
  });

  it("graph search via entity_mentions join", () => {
    store.insertEntity({
      id: "e1",
      name: "TensorFlow",
      type: "topic",
      description: "ML framework",
    });
    store.insertChunk({
      id: "c1",
      sourceUri: "t://1",
      content: "using the framework for training",
    });
    store.db
      .prepare("INSERT INTO entity_mentions (id, entity_id, chunk_id) VALUES (?, ?, ?)")
      .run("em1", "e1", "c1");
    const results = hybridSearch(store.db, { query: "TensorFlow" });
    expect(results.some((r) => r.id === "c1")).toBe(true);
  });

  it("empty query returns empty or does not crash", () => {
    store.insertChunk({ id: "c1", sourceUri: "t://1", content: "test" });
    const results = hybridSearch(store.db, { query: "" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("minScore filtering works", () => {
    store.insertChunk({ id: "c1", sourceUri: "t://1", content: "alpha beta gamma" });
    const all = hybridSearch(store.db, { query: "alpha", minScore: 0 });
    const filtered = hybridSearch(store.db, { query: "alpha", minScore: 999 });
    expect(all.length).toBeGreaterThanOrEqual(filtered.length);
    expect(filtered).toHaveLength(0);
  });
});
