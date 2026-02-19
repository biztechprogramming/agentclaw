import { describe, expect, it, afterEach } from "vitest";
import { Mediator } from "../../../mediatr/mediator.ts";
import type {
  IndexContentCommand,
  SearchKnowledgeQuery,
  StoreEntityCommand,
  CreateRelationshipCommand,
} from "../commands.ts";
import {
  IndexContentHandler,
  StoreEntityHandler,
  CreateRelationshipHandler,
  SearchKnowledgeHandler,
} from "../handlers.ts";
import { hybridSearch } from "../search.ts";
import { KnowledgeStore } from "../store.ts";

describe("KnowledgeStore", () => {
  let store: KnowledgeStore;

  afterEach(() => {
    store?.close();
  });

  it("creates tables on initialization", () => {
    store = new KnowledgeStore();
    const tables = store.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("content_chunks");
    expect(names).toContain("entities");
    expect(names).toContain("relationships");
    expect(names).toContain("audit_log");
    expect(names).toContain("capability_policies");
  });

  it("inserts and retrieves content chunks", async () => {
    store = new KnowledgeStore();
    await store.insertChunk({ id: "c1", sourceUri: "test://doc", content: "Hello world" });
    const chunk = store.getChunk("c1");
    expect(chunk).toBeDefined();
    expect(chunk!.content).toBe("Hello world");
    expect(chunk!.content_hash).toBe(KnowledgeStore.contentHash("Hello world"));
  });

  it("inserts and retrieves entities", () => {
    store = new KnowledgeStore();
    store.insertEntity({ id: "e1", name: "Alice", type: "person", description: "A person" });
    const entity = store.getEntity("e1");
    expect(entity).toBeDefined();
    expect(entity!.name).toBe("Alice");
  });

  it("FTS5 search works", async () => {
    store = new KnowledgeStore();
    await store.insertChunk({
      id: "c1",
      sourceUri: "test://a",
      content: "The quick brown fox jumps",
    });
    await store.insertChunk({ id: "c2", sourceUri: "test://b", content: "A lazy dog sleeps" });

    const results = await hybridSearch(store.db, { query: "fox" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe("c1");
  });

  it("logs audit entries", () => {
    store = new KnowledgeStore();
    store.logAudit({ id: "a1", action: "test", actor: "system", details: { key: "value" } });
    const row = store.db.prepare("SELECT * FROM audit_log WHERE id = ?").get("a1") as unknown;
    expect(row.action).toBe("test");
  });

  it("capability policies CRUD", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "allow", channel: "discord" });
    const policies = store.getPolicies("send_email");
    expect(policies).toHaveLength(1);
    expect(policies[0].effect).toBe("allow");
  });
});

describe("Knowledge Store MediatR handlers", () => {
  let store: KnowledgeStore;
  let mediator: Mediator;

  afterEach(() => {
    store?.close();
  });

  it("indexes and searches content via mediator", async () => {
    store = new KnowledgeStore();
    mediator = new Mediator();
    mediator.registerHandler("IndexContent", new IndexContentHandler(store));
    mediator.registerHandler("SearchKnowledge", new SearchKnowledgeHandler(store));

    const id = await mediator.send<string>({
      __requestType: "IndexContent",
      sourceUri: "test://doc",
      content: "TypeScript is a typed superset of JavaScript",
    } as IndexContentCommand);

    expect(id).toBeTruthy();

    const results = await mediator.send({
      __requestType: "SearchKnowledge",
      query: "TypeScript",
    } as SearchKnowledgeQuery);

    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("stores entities and creates relationships via mediator", async () => {
    store = new KnowledgeStore();
    mediator = new Mediator();
    mediator.registerHandler("StoreEntity", new StoreEntityHandler(store));
    mediator.registerHandler("CreateRelationship", new CreateRelationshipHandler(store));

    const id1 = await mediator.send<string>({
      __requestType: "StoreEntity",
      name: "Alice",
      type: "person",
    } as StoreEntityCommand);

    const id2 = await mediator.send<string>({
      __requestType: "StoreEntity",
      name: "Bob",
      type: "person",
    } as StoreEntityCommand);

    const relId = await mediator.send<string>({
      __requestType: "CreateRelationship",
      sourceId: id1,
      targetId: id2,
      type: "knows",
    } as CreateRelationshipCommand);

    expect(relId).toBeTruthy();
  });
});
