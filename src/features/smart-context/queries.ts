/**
 * MediatR queries for Smart Context.
 * @module features/smart-context/queries
 */

import type { IRequest } from "../../mediatr/types.ts";
import type { ContextWindow } from "./types.ts";

/** Main RAG query — retrieve relevant context for current turn */
export interface RetrieveRelevantContextQuery extends IRequest<ContextWindow> {
  readonly __requestType: "RetrieveRelevantContext";
  readonly sessionId: string;
  readonly currentQuery: string;
  readonly recentTurns: Array<{ role: string; content: string }>;
  readonly entityIds?: string[];
}

/** Get the latest session summary */
export interface GetSessionSummaryQuery extends IRequest<
  { summary: string; keyTopics: string[] } | undefined
> {
  readonly __requestType: "GetSessionSummary";
  readonly sessionId: string;
}
