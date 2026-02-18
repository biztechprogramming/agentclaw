/**
 * MediatR commands for Structured Memory.
 * @module features/structured-memory/commands
 */

import type { IRequest } from "../../mediatr/types.ts";
import type { ExtractionResult, MemoryEntry } from "./types.ts";

/** Extract entities from input text */
export interface ExtractEntitiesCommand extends IRequest<ExtractionResult> {
  readonly __requestType: "ExtractEntities";
  readonly text: string;
}

/** Create relationships between entities */
export interface LinkEntitiesCommand extends IRequest<string[]> {
  readonly __requestType: "LinkEntities";
  readonly links: Array<{
    sourceId: string;
    targetId: string;
    type: string;
    weight?: number;
  }>;
}

/** Soft-delete an entity */
export interface ForgetEntityCommand extends IRequest {
  readonly __requestType: "ForgetEntity";
  readonly entityId: string;
}

/** Full pipeline: extract + store + link */
export interface IndexMessageCommand extends IRequest<MemoryEntry> {
  readonly __requestType: "IndexMessage";
  readonly sourceUri: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}
