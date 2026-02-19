/**
 * EntityGraph — graph operations on top of Knowledge Store's entity/relationship tables.
 * @module foundations/entity-graph/graph
 */

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface GraphEntity {
  id: string;
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  metadata?: Record<string, unknown>;
}

/**
 * EntityGraph provides graph traversal and manipulation
 * over the Knowledge Store's entities and relationships tables.
 */
export class EntityGraph {
  constructor(private readonly db: Database.Database) {}

  /** Add an entity, returning its id */
  addEntity(params: {
    name: string;
    type: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): string {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO entities (id, name, type, description, metadata) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        params.name,
        params.type,
        params.description ?? null,
        JSON.stringify(params.metadata ?? {}),
      );
    return id;
  }

  /** Add a relationship between two entities, returning its id */
  addRelationship(params: {
    sourceId: string;
    targetId: string;
    type: string;
    weight?: number;
    metadata?: Record<string, unknown>;
  }): string {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO relationships (id, source_id, target_id, type, weight, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        params.sourceId,
        params.targetId,
        params.type,
        params.weight ?? 1.0,
        JSON.stringify(params.metadata ?? {}),
      );
    return id;
  }

  /** Get an entity by id */
  getEntity(id: string): GraphEntity | undefined {
    const row = this.db.prepare("SELECT * FROM entities WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      return undefined;
    }
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as string,
      description: row.description as string | undefined,
      metadata: JSON.parse((row.metadata as string) || "{}"),
    };
  }

  /** Find entity by name and optional type (empty/undefined type = type-agnostic) */
  findEntity(name: string, type?: string): GraphEntity | undefined {
    const query = type
      ? "SELECT * FROM entities WHERE name = ? AND type = ?"
      : "SELECT * FROM entities WHERE name = ? LIMIT 1";
    const row = (
      type ? this.db.prepare(query).get(name, type) : this.db.prepare(query).get(name)
    ) as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as string,
      description: row.description as string | undefined,
      metadata: JSON.parse((row.metadata as string) || "{}"),
    };
  }

  /** Get all relationships for an entity (as source or target) */
  getRelationships(entityId: string): GraphRelationship[] {
    const rows = this.db
      .prepare("SELECT * FROM relationships WHERE source_id = ? OR target_id = ?")
      .all(entityId, entityId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: r.id as string,
      sourceId: r.source_id as string,
      targetId: r.target_id as string,
      type: r.type as string,
      weight: r.weight as number,
      metadata: JSON.parse((r.metadata as string) || "{}"),
    }));
  }

  /** Get direct neighbors of an entity */
  getNeighbors(entityId: string): GraphEntity[] {
    const rels = this.getRelationships(entityId);
    const neighborIds = new Set<string>();
    for (const r of rels) {
      if (r.sourceId === entityId) {
        neighborIds.add(r.targetId);
      } else {
        neighborIds.add(r.sourceId);
      }
    }
    const entities: GraphEntity[] = [];
    for (const nid of neighborIds) {
      const e = this.getEntity(nid);
      if (e) {
        entities.push(e);
      }
    }
    return entities;
  }

  /** BFS to find shortest path between two entities. Returns entity ids or empty if no path. */
  findPath(startId: string, endId: string, maxDepth = 10): string[] {
    if (startId === endId) {
      return [startId];
    }
    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.path.length > maxDepth) {
        continue;
      }

      const neighbors = this.getNeighbors(current.id);
      for (const n of neighbors) {
        if (n.id === endId) {
          return [...current.path, n.id];
        }
        if (!visited.has(n.id)) {
          visited.add(n.id);
          queue.push({ id: n.id, path: [...current.path, n.id] });
        }
      }
    }
    return [];
  }

  /** Decay all relationship weights by a factor (e.g., 0.95 = 5% decay) */
  decay(factor: number): number {
    const result = this.db
      .prepare("UPDATE relationships SET weight = weight * ?, updated_at = datetime('now')")
      .run(factor);
    return result.changes;
  }
}
