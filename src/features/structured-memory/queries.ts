/**
 * MediatR queries for Structured Memory.
 * @module features/structured-memory/queries
 */

import type { GraphEntity, GraphRelationship } from "../../foundations/entity-graph/graph.ts";
import type { SearchResult } from "../../foundations/knowledge-store/search.ts";
import type { IRequest } from "../../mediatr/types.ts";

/** Hybrid search with entity boosting */
export interface SearchMemoryQuery extends IRequest<SearchResult[]> {
  readonly __requestType: "SearchMemory";
  readonly query: string;
  readonly limit?: number;
  readonly minScore?: number;
  /** Boost results mentioning these entity ids */
  readonly boostEntityIds?: string[];
}

/** Get full context for an entity: entity + relationships + recent mentions */
export interface GetEntityContextQuery extends IRequest<EntityContext> {
  readonly __requestType: "GetEntityContext";
  readonly entityId: string;
  readonly mentionLimit?: number;
}

export interface EntityContext {
  entity: GraphEntity;
  relationships: GraphRelationship[];
  recentMentions: Array<{ chunkId: string; content: string; createdAt: string }>;
}

/** Find path between two entities via graph traversal */
export interface GetRelationshipPathQuery extends IRequest<string[]> {
  readonly __requestType: "GetRelationshipPath";
  readonly startEntityId: string;
  readonly endEntityId: string;
  readonly maxDepth?: number;
}
