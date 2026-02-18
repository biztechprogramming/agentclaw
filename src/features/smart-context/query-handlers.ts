/**
 * MediatR query handlers for Smart Context.
 * @module features/smart-context/query-handlers
 */

import type { IRequestHandler } from "../../mediatr/types.ts";
import type { RetrieveRelevantContextQuery, GetSessionSummaryQuery } from "./queries.ts";
import type { SessionSummarizer } from "./summarizer.ts";
import type { ContextWindow } from "./types.ts";
import type { ContextWindowManager } from "./window-manager.ts";

/** Handler for RetrieveRelevantContext */
export class RetrieveRelevantContextHandler implements IRequestHandler<
  RetrieveRelevantContextQuery,
  ContextWindow
> {
  constructor(private readonly windowManager: ContextWindowManager) {}

  async handle(request: RetrieveRelevantContextQuery): Promise<ContextWindow> {
    return this.windowManager.buildWindow(
      request.sessionId,
      request.recentTurns,
      request.currentQuery,
      request.entityIds,
    );
  }
}

/** Handler for GetSessionSummary */
export class GetSessionSummaryHandler implements IRequestHandler<
  GetSessionSummaryQuery,
  { summary: string; keyTopics: string[] } | undefined
> {
  constructor(private readonly summarizer: SessionSummarizer) {}

  async handle(
    request: GetSessionSummaryQuery,
  ): Promise<{ summary: string; keyTopics: string[] } | undefined> {
    return this.summarizer.getLatestSummary(request.sessionId);
  }
}
