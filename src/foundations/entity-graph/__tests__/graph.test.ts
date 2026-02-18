import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnowledgeStore } from "../../knowledge-store/store.ts";
import { EntityGraph } from "../graph.ts";

describe("EntityGraph", () => {
  let store: KnowledgeStore;
  let graph: EntityGraph;

  beforeEach(() => {
    store = new KnowledgeStore({ dbPath: ":memory:" });
    graph = new EntityGraph(store.db);
  });

  afterEach(() => {
    store.close();
  });

  it("addEntity + getEntity round-trips", () => {
    const id = graph.addEntity({ name: "Alice", type: "person", description: "Engineer" });
    const entity = graph.getEntity(id);
    expect(entity).toBeDefined();
    expect(entity!.name).toBe("Alice");
    expect(entity!.type).toBe("person");
    expect(entity!.description).toBe("Engineer");
  });

  it("getEntity returns undefined for missing id", () => {
    expect(graph.getEntity("nonexistent")).toBeUndefined();
  });

  it("findEntity by name and type", () => {
    graph.addEntity({ name: "Bob", type: "person" });
    const found = graph.findEntity("Bob", "person");
    expect(found).toBeDefined();
    expect(found!.name).toBe("Bob");
    expect(graph.findEntity("Bob", "project")).toBeUndefined();
  });

  it("addRelationship + getRelationships", () => {
    const a = graph.addEntity({ name: "A", type: "person" });
    const b = graph.addEntity({ name: "B", type: "person" });
    graph.addRelationship({ sourceId: a, targetId: b, type: "knows", weight: 0.8 });
    const rels = graph.getRelationships(a);
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe("knows");
    expect(rels[0].weight).toBe(0.8);
    // Also visible from b's side
    expect(graph.getRelationships(b)).toHaveLength(1);
  });

  it("getNeighbors returns connected entities", () => {
    const a = graph.addEntity({ name: "A", type: "t" });
    const b = graph.addEntity({ name: "B", type: "t" });
    const c = graph.addEntity({ name: "C", type: "t" });
    graph.addRelationship({ sourceId: a, targetId: b, type: "r" });
    graph.addRelationship({ sourceId: a, targetId: c, type: "r" });
    const neighbors = graph.getNeighbors(a);
    expect(neighbors).toHaveLength(2);
    const names = neighbors.map((n) => n.name).toSorted();
    expect(names).toEqual(["B", "C"]);
  });

  it("findPath: path exists A→B→C", () => {
    const a = graph.addEntity({ name: "A", type: "t" });
    const b = graph.addEntity({ name: "B", type: "t" });
    const c = graph.addEntity({ name: "C", type: "t" });
    graph.addRelationship({ sourceId: a, targetId: b, type: "r" });
    graph.addRelationship({ sourceId: b, targetId: c, type: "r" });
    const path = graph.findPath(a, c);
    expect(path).toEqual([a, b, c]);
  });

  it("findPath: no path returns empty array", () => {
    const a = graph.addEntity({ name: "A", type: "t" });
    const b = graph.addEntity({ name: "B", type: "t" });
    // No relationship
    const path = graph.findPath(a, b);
    expect(path).toEqual([]);
  });

  it("findPath: same node returns [node]", () => {
    const a = graph.addEntity({ name: "A", type: "t" });
    expect(graph.findPath(a, a)).toEqual([a]);
  });

  it("decay reduces weights", () => {
    const a = graph.addEntity({ name: "A", type: "t" });
    const b = graph.addEntity({ name: "B", type: "t" });
    graph.addRelationship({ sourceId: a, targetId: b, type: "r", weight: 1.0 });
    const changed = graph.decay(0.5);
    expect(changed).toBe(1);
    const rels = graph.getRelationships(a);
    expect(rels[0].weight).toBeCloseTo(0.5);
  });
});
