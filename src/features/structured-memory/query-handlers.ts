/**
 * MediatR query handlers for Structured Memory.
 * @module features/structured-memory/query-handlers
 */

import type Database from "better-sqlite3";
import type { EntityGraph } from "../../foundations/entity-graph/graph.ts";
import type { SearchResult } from "../../foundations/knowledge-store/search.ts";
import { hybridSearch } from "../../foundations/knowledge-store/search.ts";
import type { IRequestHandler } from "../../mediatr/types.ts";
import type {
  SearchMemoryQuery,
  GetEntityContextQuery,
  GetRelationshipPathQuery,
  EntityContext,
} from "./queries.ts";

/** Handler for SearchMemory — hybrid search with optional entity boosting */
export class SearchMemoryHandler implements IRequestHandler<SearchMemoryQuery, SearchResult[]> {
  constructor(
    private readonly db: Database.Database,
    private readonly graph: EntityGraph,
  ) {}

  async handle(request: SearchMemoryQuery): Promise<SearchResult[]> {
    const results = await hybridSearch(this.db, {
      query: request.query,
      limit: (request.limit ?? 20) * 2, // fetch extra for boosting
      minScore: request.minScore,
    });

    if (request.boostEntityIds?.length) {
      const boosted = new Set(request.boostEntityIds);
      // Boost results that have mentions from boosted entities
      for (const result of results) {
        try {
          const mentions = this.db
            .prepare("SELECT entity_id FROM entity_mentions WHERE chunk_id = ?")
            .all(result.id) as Array<{ entity_id: string }>;
          if (mentions.some((m) => boosted.has(m.entity_id))) {
            result.score *= 1.5;
          }
        } catch {
          // skip if table not populated
        }
      }
      results.sort((a, b) => b.score - a.score);
    }

    // Filter out results whose chunks only link to forgotten entities
    const filtered = results.filter((result) => {
      try {
        const mentions = this.db
          .prepare("SELECT entity_id FROM entity_mentions WHERE chunk_id = ?")
          .all(result.id) as Array<{ entity_id: string }>;
        if (mentions.length === 0) {
          return true;
        }
        const allForgotten = mentions.every((m) => {
          const entity = this.db
            .prepare("SELECT metadata FROM entities WHERE id = ?")
            .get(m.entity_id) as { metadata: string } | undefined;
          if (!entity) {
            return false;
          }
          const meta = JSON.parse(entity.metadata || "{}") as Record<string, unknown>;
          return !!meta.forgotten;
        });
        return !allForgotten;
      } catch {
        return true;
      }
    });

    return filtered.slice(0, request.limit ?? 20);
  }
}

/** Handler for GetEntityContext */
export class GetEntityContextHandler implements IRequestHandler<
  GetEntityContextQuery,
  EntityContext
> {
  constructor(
    private readonly db: Database.Database,
    private readonly graph: EntityGraph,
  ) {}

  async handle(request: GetEntityContextQuery): Promise<EntityContext> {
    const entity = this.graph.getEntity(request.entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${request.entityId}`);
    }
    if (entity.metadata?.forgotten) {
      throw new Error(`Entity has been forgotten: ${request.entityId}`);
    }

    const relationships = this.graph.getRelationships(request.entityId);
    const limit = request.mentionLimit ?? 10;

    const mentions = this.db
      .prepare(`
        SELECT em.chunk_id, c.content, c.created_at
        FROM entity_mentions em
        JOIN content_chunks c ON c.id = em.chunk_id
        WHERE em.entity_id = ?
        ORDER BY c.created_at DESC
        LIMIT ?
      `)
      .all(request.entityId, limit) as Array<{
      chunk_id: string;
      content: string;
      created_at: string;
    }>;

    return {
      entity,
      relationships,
      recentMentions: mentions.map((m) => ({
        chunkId: m.chunk_id,
        content: m.content,
        createdAt: m.created_at,
      })),
    };
  }
}

/** Handler for GetRelationshipPath */
export class GetRelationshipPathHandler implements IRequestHandler<
  GetRelationshipPathQuery,
  string[]
> {
  constructor(private readonly graph: EntityGraph) {}

  async handle(request: GetRelationshipPathQuery): Promise<string[]> {
    return this.graph.findPath(request.startEntityId, request.endEntityId, request.maxDepth);
  }
}
