/**
 * MediatR commands for Smart Context.
 * @module features/smart-context/commands
 */

import type { IRequest } from "../../mediatr/types.ts";
import type { SummarizationResult } from "./types.ts";

/** Summarize N conversation turns */
export interface SummarizeTurnsCommand extends IRequest<SummarizationResult> {
  readonly __requestType: "SummarizeTurns";
  readonly sessionId: string;
  readonly turns: Array<{ role: string; content: string }>;
  readonly channel?: string;
}

/** Force session compaction */
export interface CompactSessionCommand extends IRequest<SummarizationResult> {
  readonly __requestType: "CompactSession";
  readonly sessionId: string;
  readonly turns: Array<{ role: string; content: string }>;
  readonly channel?: string;
}
