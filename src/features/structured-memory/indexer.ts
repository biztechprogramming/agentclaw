/**
 * MemoryIndexer — orchestrates text chunking, entity extraction, and storage.
 * @module features/structured-memory/indexer
 */

import { randomUUID } from "node:crypto";
import type { EntityGraph } from "../../foundations/entity-graph/graph.ts";
import type { KnowledgeStore } from "../../foundations/knowledge-store/store.ts";
import type { Mediator } from "../../mediatr/mediator.ts";
import type {
  ContentIndexed,
  EntityDiscovered,
} from "../../mediatr/notifications/domain-events.ts";
import type { EntityExtractor } from "./extractor.ts";
import type { MemoryEntry } from "./types.ts";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/** Split text into overlapping chunks */
function chunkText(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (text.length <= size) {
    return [text];
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

/**
 * MemoryIndexer: chunk text → extract entities → store in KnowledgeStore → emit notifications.
 */
export class MemoryIndexer {
  constructor(
    private readonly store: KnowledgeStore,
    private readonly graph: EntityGraph,
    private readonly extractor: EntityExtractor,
    private readonly mediator: Mediator,
  ) {}

  /** Re-index content: delete existing chunks for sourceUri, then index fresh */
  async reindex(
    sourceUri: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<MemoryEntry> {
    // Delete existing entity mentions for chunks of this sourceUri
    this.store.db
      .prepare(
        "DELETE FROM entity_mentions WHERE chunk_id IN (SELECT id FROM content_chunks WHERE source_uri = ?)",
      )
      .run(sourceUri);
    // Delete existing chunks
    this.store.db.prepare("DELETE FROM content_chunks WHERE source_uri = ?").run(sourceUri);
    return this.index(sourceUri, content, metadata);
  }

  /** Index a piece of content, returning a MemoryEntry */
  async index(
    sourceUri: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<MemoryEntry> {
    const chunks = chunkText(content);
    const allEntityIds: string[] = [];
    let firstChunkId = "";

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = randomUUID();
      if (i === 0) {
        firstChunkId = chunkId;
      }

      // Store chunk
      await this.store.insertChunk({
        id: chunkId,
        sourceUri,
        chunkIndex: i,
        content: chunks[i],
        metadata,
      });

      // Extract entities
      const result = await this.extractor.extract(chunks[i]);

      for (const entity of result.entities) {
        // Dedup: check for existing entity with same name+type
        const existing = this.graph.findEntity(entity.name, entity.type);
        let entityId: string;

        if (existing) {
          entityId = existing.id;
        } else {
          entityId = this.graph.addEntity({
            name: entity.name,
            type: entity.type,
            description: entity.description,
          });

          // Emit EntityDiscovered
          await this.mediator.publish({
            __notificationType: "EntityDiscovered",
            entityId,
            name: entity.name,
            type: entity.type,
          } as EntityDiscovered);
        }

        allEntityIds.push(entityId);

        // Create entity mention
        this.store.db
          .prepare(
            "INSERT INTO entity_mentions (id, entity_id, chunk_id, start_offset, end_offset) VALUES (?, ?, ?, ?, ?)",
          )
          .run(
            randomUUID(),
            entityId,
            chunkId,
            entity.startOffset ?? null,
            entity.endOffset ?? null,
          );
      }

      // Create relationships between co-occurring entities
      for (const rel of result.relationships) {
        const src = this.graph.findEntity(rel.sourceName, "");
        const tgt = this.graph.findEntity(rel.targetName, "");
        if (src && tgt) {
          this.graph.addRelationship({ sourceId: src.id, targetId: tgt.id, type: rel.type });
        }
      }

      // Emit ContentIndexed
      await this.mediator.publish({
        __notificationType: "ContentIndexed",
        chunkId,
        sourceUri,
        entityIds: allEntityIds,
      } as ContentIndexed);
    }

    const uniqueEntityIds = [...new Set(allEntityIds)];
    return {
      id: randomUUID(),
      sourceUri,
      content,
      entityIds: uniqueEntityIds,
      chunkId: firstChunkId,
      timestamp: new Date().toISOString(),
    };
  }
}
