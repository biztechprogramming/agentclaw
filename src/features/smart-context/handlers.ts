/**
 * MediatR handlers for Smart Context commands.
 * @module features/smart-context/handlers
 */

import type { IRequestHandler } from "../../mediatr/types.ts";
import type { SummarizeTurnsCommand, CompactSessionCommand } from "./commands.ts";
import type { SessionSummarizer } from "./summarizer.ts";
import type { SummarizationResult } from "./types.ts";

/** Handler for SummarizeTurns */
export class SummarizeTurnsHandler implements IRequestHandler<
  SummarizeTurnsCommand,
  SummarizationResult
> {
  constructor(private readonly summarizer: SessionSummarizer) {}

  async handle(request: SummarizeTurnsCommand): Promise<SummarizationResult> {
    return this.summarizer.summarize(request.sessionId, request.turns, request.channel);
  }
}

/** Handler for CompactSession — same as summarize but marks as compaction */
export class CompactSessionHandler implements IRequestHandler<
  CompactSessionCommand,
  SummarizationResult
> {
  constructor(private readonly summarizer: SessionSummarizer) {}

  async handle(request: CompactSessionCommand): Promise<SummarizationResult> {
    return this.summarizer.summarize(request.sessionId, request.turns, request.channel);
  }
}
