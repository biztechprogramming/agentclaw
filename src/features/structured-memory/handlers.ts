/**
 * MediatR handlers for Structured Memory commands.
 * @module features/structured-memory/handlers
 */

import type { EntityGraph } from "../../foundations/entity-graph/graph.ts";
import type { KnowledgeStore } from "../../foundations/knowledge-store/store.ts";
import type { IRequestHandler } from "../../mediatr/types.ts";
import type {
  ExtractEntitiesCommand,
  LinkEntitiesCommand,
  ForgetEntityCommand,
  IndexMessageCommand,
} from "./commands.ts";
import type { EntityExtractor } from "./extractor.ts";
import type { MemoryIndexer } from "./indexer.ts";
import type { ExtractionResult, MemoryEntry } from "./types.ts";

/** Handler for ExtractEntities */
export class ExtractEntitiesHandler implements IRequestHandler<
  ExtractEntitiesCommand,
  ExtractionResult
> {
  constructor(private readonly extractor: EntityExtractor) {}

  async handle(request: ExtractEntitiesCommand): Promise<ExtractionResult> {
    return this.extractor.extract(request.text);
  }
}

/** Handler for LinkEntities */
export class LinkEntitiesHandler implements IRequestHandler<LinkEntitiesCommand, string[]> {
  constructor(private readonly graph: EntityGraph) {}

  async handle(request: LinkEntitiesCommand): Promise<string[]> {
    const ids: string[] = [];
    for (const link of request.links) {
      const id = this.graph.addRelationship({
        sourceId: link.sourceId,
        targetId: link.targetId,
        type: link.type,
        weight: link.weight,
      });
      ids.push(id);
    }
    return ids;
  }
}

/** Handler for ForgetEntity — soft-delete via metadata flag */
export class ForgetEntityHandler implements IRequestHandler<ForgetEntityCommand> {
  constructor(private readonly store: KnowledgeStore) {}

  async handle(request: ForgetEntityCommand): Promise<void> {
    this.store.db
      .prepare(
        "UPDATE entities SET metadata = json_set(metadata, '$.forgotten', true), updated_at = datetime('now') WHERE id = ?",
      )
      .run(request.entityId);
  }
}

/** Handler for IndexMessage — full pipeline */
export class IndexMessageHandler implements IRequestHandler<IndexMessageCommand, MemoryEntry> {
  constructor(private readonly indexer: MemoryIndexer) {}

  async handle(request: IndexMessageCommand): Promise<MemoryEntry> {
    return this.indexer.index(request.sourceUri, request.content, request.metadata);
  }
}
