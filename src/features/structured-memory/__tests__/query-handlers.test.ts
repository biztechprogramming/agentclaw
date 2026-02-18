import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EntityGraph } from "../../../foundations/entity-graph/graph.ts";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import type {
  SearchMemoryQuery,
  GetEntityContextQuery,
  GetRelationshipPathQuery,
} from "../queries.ts";
import {
  SearchMemoryHandler,
  GetEntityContextHandler,
  GetRelationshipPathHandler,
} from "../query-handlers.ts";

describe("Structured Memory Query Handlers", () => {
  let store: KnowledgeStore;
  let graph: EntityGraph;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    graph = new EntityGraph(store.db);
  });

  afterEach(() => {
    store.close();
  });

  describe("SearchMemoryHandler", () => {
    it("returns results from knowledge store", async () => {
      store.insertChunk({
        id: "c1",
        sourceUri: "test://1",
        content: "machine learning algorithms overview",
      });
      const handler = new SearchMemoryHandler(store.db, graph);
      const results = await handler.handle({
        __requestType: "SearchMemory",
        query: "machine learning",
      } as SearchMemoryQuery);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain("machine learning");
    });
  });

  describe("GetEntityContextHandler", () => {
    it("returns entity + relationships + mentions", async () => {
      store.insertEntity({ id: "e1", name: "Alice", type: "person" });
      store.insertEntity({ id: "e2", name: "Bob", type: "person" });
      store.insertRelationship({ id: "r1", sourceId: "e1", targetId: "e2", type: "knows" });
      store.insertChunk({ id: "c1", sourceUri: "test://1", content: "Alice met Bob" });
      store.db
        .prepare("INSERT INTO entity_mentions (id, entity_id, chunk_id) VALUES (?, ?, ?)")
        .run("em1", "e1", "c1");

      const handler = new GetEntityContextHandler(store.db, graph);
      const ctx = await handler.handle({
        __requestType: "GetEntityContext",
        entityId: "e1",
      } as GetEntityContextQuery);
      expect(ctx.entity.name).toBe("Alice");
      expect(ctx.relationships).toHaveLength(1);
      expect(ctx.recentMentions).toHaveLength(1);
    });

    it("throws for missing entity", async () => {
      const handler = new GetEntityContextHandler(store.db, graph);
      await expect(
        handler.handle({
          __requestType: "GetEntityContext",
          entityId: "nonexistent",
        } as GetEntityContextQuery),
      ).rejects.toThrow("Entity not found");
    });
  });

  describe("GetRelationshipPathHandler", () => {
    it("finds path between entities", async () => {
      const a = graph.addEntity({ name: "A", type: "t" });
      const b = graph.addEntity({ name: "B", type: "t" });
      const c = graph.addEntity({ name: "C", type: "t" });
      graph.addRelationship({ sourceId: a, targetId: b, type: "r" });
      graph.addRelationship({ sourceId: b, targetId: c, type: "r" });
      const handler = new GetRelationshipPathHandler(graph);
      const path = await handler.handle({
        __requestType: "GetRelationshipPath",
        startEntityId: a,
        endEntityId: c,
      } as GetRelationshipPathQuery);
      expect(path).toEqual([a, b, c]);
    });
  });
});
