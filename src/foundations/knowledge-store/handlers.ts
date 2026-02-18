/**
 * MediatR handlers for Knowledge Store commands.
 * @module foundations/knowledge-store/handlers
 */

import { randomUUID } from "node:crypto";
import type { IRequestHandler } from "../../mediatr/types.ts";
import type {
  IndexContentCommand,
  SearchKnowledgeQuery,
  StoreEntityCommand,
  CreateRelationshipCommand,
} from "./commands.ts";
import type { SearchResult } from "./search.ts";
import { hybridSearch } from "./search.ts";
import type { KnowledgeStore } from "./store.ts";

/** Handler for IndexContent — chunks and stores content */
export class IndexContentHandler implements IRequestHandler<IndexContentCommand, string> {
  constructor(private store: KnowledgeStore) {}

  async handle(request: IndexContentCommand): Promise<string> {
    const id = randomUUID();
    this.store.insertChunk({
      id,
      sourceUri: request.sourceUri,
      chunkIndex: request.chunkIndex,
      content: request.content,
      metadata: request.metadata,
    });
    return id;
  }
}

/** Handler for SearchKnowledge — hybrid search */
export class SearchKnowledgeHandler implements IRequestHandler<
  SearchKnowledgeQuery,
  SearchResult[]
> {
  constructor(private store: KnowledgeStore) {}

  async handle(request: SearchKnowledgeQuery): Promise<SearchResult[]> {
    return hybridSearch(this.store.db, {
      query: request.query,
      limit: request.limit,
      minScore: request.minScore,
    });
  }
}

/** Handler for StoreEntity */
export class StoreEntityHandler implements IRequestHandler<StoreEntityCommand, string> {
  constructor(private store: KnowledgeStore) {}

  async handle(request: StoreEntityCommand): Promise<string> {
    const id = randomUUID();
    this.store.insertEntity({
      id,
      name: request.name,
      type: request.type,
      description: request.description,
      metadata: request.metadata,
    });
    return id;
  }
}

/** Handler for CreateRelationship */
export class CreateRelationshipHandler implements IRequestHandler<
  CreateRelationshipCommand,
  string
> {
  constructor(private store: KnowledgeStore) {}

  async handle(request: CreateRelationshipCommand): Promise<string> {
    const id = randomUUID();
    this.store.insertRelationship({
      id,
      sourceId: request.sourceId,
      targetId: request.targetId,
      type: request.type,
      weight: request.weight,
      metadata: request.metadata,
    });
    return id;
  }
}
