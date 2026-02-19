import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EntityGraph } from "../../../foundations/entity-graph/graph.ts";
import { KnowledgeStore } from "../../../foundations/knowledge-store/store.ts";
import { Mediator } from "../../../mediatr/mediator.ts";
import type {
  ForgetEntityCommand,
  ExtractEntitiesCommand,
  LinkEntitiesCommand,
  IndexMessageCommand,
} from "../commands.ts";
import { EntityExtractor } from "../extractor.ts";
import {
  ForgetEntityHandler,
  ExtractEntitiesHandler,
  LinkEntitiesHandler,
  IndexMessageHandler,
} from "../handlers.ts";
import { MemoryIndexer } from "../indexer.ts";
import { EntityType } from "../types.ts";

describe("Structured Memory Command Handlers", () => {
  let store: KnowledgeStore;
  let graph: EntityGraph;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    graph = new EntityGraph(store.db);
  });

  afterEach(() => {
    store.close();
  });

  describe("ForgetEntityHandler", () => {
    it("sets forgotten flag on entity metadata", async () => {
      store.insertEntity({ id: "e1", name: "Alice", type: "person" });
      const handler = new ForgetEntityHandler(store);
      await handler.handle({
        __requestType: "ForgetEntity",
        entityId: "e1",
      } as ForgetEntityCommand);

      const row = store.db.prepare("SELECT metadata FROM entities WHERE id = ?").get("e1") as {
        metadata: string;
      };
      const meta = JSON.parse(row.metadata) as Record<string, unknown>;
      expect(meta.forgotten).toBeTruthy();
    });

    it("preserves existing metadata when forgetting", async () => {
      store.insertEntity({ id: "e2", name: "Bob", type: "person", metadata: { role: "admin" } });
      const handler = new ForgetEntityHandler(store);
      await handler.handle({
        __requestType: "ForgetEntity",
        entityId: "e2",
      } as ForgetEntityCommand);

      const row = store.db.prepare("SELECT metadata FROM entities WHERE id = ?").get("e2") as {
        metadata: string;
      };
      const meta = JSON.parse(row.metadata) as Record<string, unknown>;
      expect(meta.forgotten).toBeTruthy();
      expect(meta.role).toBe("admin");
    });
  });

  describe("ExtractEntitiesHandler", () => {
    it("extracts entities from text", async () => {
      const extractor = new EntityExtractor();
      const handler = new ExtractEntitiesHandler(extractor);
      const result = await handler.handle({
        __requestType: "ExtractEntities",
        text: "John Smith works on PROJ-42",
      } as ExtractEntitiesCommand);
      expect(result.entities.length).toBeGreaterThan(0);
      const names = result.entities.map((e) => e.name);
      expect(names).toContain("John Smith");
    });
  });

  describe("LinkEntitiesHandler", () => {
    it("creates relationships between entities", async () => {
      const a = graph.addEntity({ name: "A", type: "t" });
      const b = graph.addEntity({ name: "B", type: "t" });
      const handler = new LinkEntitiesHandler(graph);
      const ids = await handler.handle({
        __requestType: "LinkEntities",
        links: [{ sourceId: a, targetId: b, type: "knows" }],
      } as LinkEntitiesCommand);
      expect(ids).toHaveLength(1);
      const rels = graph.getRelationships(a);
      expect(rels).toHaveLength(1);
      expect(rels[0].type).toBe("knows");
    });
  });

  describe("IndexMessageHandler", () => {
    it("runs full index pipeline", async () => {
      const extractor = new EntityExtractor();
      const mediator = new Mediator();
      const indexer = new MemoryIndexer(store, graph, extractor, mediator);
      const handler = new IndexMessageHandler(indexer);
      const entry = await handler.handle({
        __requestType: "IndexMessage",
        sourceUri: "test://msg1",
        content: "Alice Brown discussed PROJ-99 with Bob Jones",
      } as IndexMessageCommand);
      expect(entry.sourceUri).toBe("test://msg1");
      expect(entry.entityIds.length).toBeGreaterThan(0);
      expect(entry.chunkId).toBeTruthy();
    });
  });
});
