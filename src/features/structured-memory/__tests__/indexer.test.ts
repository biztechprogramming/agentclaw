import { describe, it, expect, beforeEach } from "vitest";
import { EntityGraph } from "../../../foundations/entity-graph/graph.ts";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { Mediator } from "../../../mediatr/mediator.ts";
import { EntityExtractor } from "../extractor.ts";
import { MemoryIndexer } from "../indexer.ts";

describe("MemoryIndexer", () => {
  let store: KnowledgeStore;
  let graph: EntityGraph;
  let extractor: EntityExtractor;
  let mediator: Mediator;
  let indexer: MemoryIndexer;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    graph = new EntityGraph(store.db);
    extractor = new EntityExtractor();
    mediator = new Mediator();
    indexer = new MemoryIndexer(store, graph, extractor, mediator);
  });

  it("indexes content and returns a MemoryEntry", async () => {
    const entry = await indexer.index("test://doc1", "John Smith is working on PROJ-42.");
    expect(entry.sourceUri).toBe("test://doc1");
    expect(entry.chunkId).toBeTruthy();
    expect(entry.entityIds.length).toBeGreaterThan(0);
  });

  it("stores chunks in the knowledge store", async () => {
    await indexer.index("test://doc2", "Some content here.");
    const chunk = store.db
      .prepare("SELECT * FROM content_chunks WHERE source_uri = ?")
      .get("test://doc2") as Record<string, unknown> | undefined;
    expect(chunk).toBeDefined();
    expect(chunk!.content).toBe("Some content here.");
  });

  it("deduplicates entities by name and type", async () => {
    await indexer.index("test://doc3", "Alice Brown joined. Alice Brown presented.");
    const entities = store.db
      .prepare("SELECT * FROM entities WHERE name = ?")
      .all("Alice Brown") as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
  });

  it("creates entity mentions", async () => {
    await indexer.index("test://doc4", "Bob Jones said hello.");
    const mentions = store.db.prepare("SELECT * FROM entity_mentions").all() as Array<
      Record<string, unknown>
    >;
    expect(mentions.length).toBeGreaterThan(0);
  });

  it("handles text with no extractable entities", async () => {
    const entry = await indexer.index("test://doc5", "just some plain text");
    expect(entry.entityIds).toHaveLength(0);
    expect(entry.chunkId).toBeTruthy();
  });

  it("reindex replaces existing chunks", async () => {
    await indexer.index("test://reindex", "Original content with John Smith.");
    const before = store.db
      .prepare("SELECT * FROM content_chunks WHERE source_uri = ?")
      .all("test://reindex") as Array<Record<string, unknown>>;
    expect(before).toHaveLength(1);
    expect(before[0].content as string).toContain("Original");

    const entry = await indexer.reindex("test://reindex", "Updated content with Bob Jones.");
    expect(entry.sourceUri).toBe("test://reindex");
    const after = store.db
      .prepare("SELECT * FROM content_chunks WHERE source_uri = ?")
      .all("test://reindex") as Array<Record<string, unknown>>;
    expect(after).toHaveLength(1);
    expect(after[0].content as string).toContain("Updated");
  });

  it("chunks long text", async () => {
    const longText = "Word ".repeat(500); // ~2500 chars
    await indexer.index("test://doc6", longText);
    const chunks = store.db
      .prepare("SELECT * FROM content_chunks WHERE source_uri = ?")
      .all("test://doc6") as Array<Record<string, unknown>>;
    expect(chunks.length).toBeGreaterThan(1);
  });
});
