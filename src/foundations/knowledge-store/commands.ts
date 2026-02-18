/**
 * MediatR command definitions for Knowledge Store operations.
 * @module foundations/knowledge-store/commands
 */

import type { IRequest } from "../../mediatr/types.ts";
import type { SearchResult } from "./search.ts";

/** Index content into the knowledge store */
export interface IndexContentCommand extends IRequest<string> {
  readonly __requestType: "IndexContent";
  sourceUri: string;
  content: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

/** Search knowledge base with hybrid search */
export interface SearchKnowledgeQuery extends IRequest<SearchResult[]> {
  readonly __requestType: "SearchKnowledge";
  query: string;
  limit?: number;
  minScore?: number;
}

/** Store an entity in the knowledge graph */
export interface StoreEntityCommand extends IRequest<string> {
  readonly __requestType: "StoreEntity";
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Create a relationship between entities */
export interface CreateRelationshipCommand extends IRequest<string> {
  readonly __requestType: "CreateRelationship";
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}
