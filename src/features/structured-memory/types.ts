/**
 * Types for the Structured Memory feature.
 * @module features/structured-memory/types
 */

/** Supported entity types */
export enum EntityType {
  Person = "person",
  Project = "project",
  Decision = "decision",
  Task = "task",
  Date = "date",
  Place = "place",
  Organization = "organization",
  Topic = "topic",
}

/** An entity extracted from text */
export interface ExtractedEntity {
  name: string;
  type: EntityType;
  description?: string;
  confidence: number;
  /** Character offsets in source text */
  startOffset?: number;
  endOffset?: number;
}

/** Result of entity extraction from a piece of text */
export interface ExtractionResult {
  entities: ExtractedEntity[];
  sourceText: string;
  /** Relationships inferred between extracted entities */
  relationships: Array<{
    sourceName: string;
    targetName: string;
    type: string;
  }>;
}

/** A memory entry stored in the knowledge graph */
export interface MemoryEntry {
  id: string;
  sourceUri: string;
  content: string;
  entityIds: string[];
  chunkId: string;
  timestamp: string;
}

/**
 * Pluggable LLM interface for entity extraction.
 * Implementations call an LLM; the stub uses regex.
 */
export interface ILLMProvider {
  extractEntities(text: string): Promise<ExtractionResult>;
}
