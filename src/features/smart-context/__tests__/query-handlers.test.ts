import { describe, it, expect, vi } from "vitest";
import type { RetrieveRelevantContextQuery, GetSessionSummaryQuery } from "../queries.ts";
import { RetrieveRelevantContextHandler, GetSessionSummaryHandler } from "../query-handlers.ts";
import type { SessionSummarizer } from "../summarizer.ts";
import type { ContextWindow } from "../types.ts";
import type { ContextWindowManager } from "../window-manager.ts";

describe("Smart Context Query Handlers", () => {
  describe("RetrieveRelevantContextHandler", () => {
    it("returns context window from window manager", async () => {
      const mockWindow: ContextWindow = {
        sessionId: "s1",
        chunks: [],
        totalTokens: 0,
        budgetTokens: 8000,
        needsCompaction: false,
      };
      const wm = {
        buildWindow: vi.fn().mockResolvedValue(mockWindow),
      } as unknown as ContextWindowManager;
      const handler = new RetrieveRelevantContextHandler(wm);
      const result = await handler.handle({
        __requestType: "RetrieveRelevantContext",
        sessionId: "s1",
        currentQuery: "test",
        recentTurns: [],
      } as RetrieveRelevantContextQuery);
      expect(result.sessionId).toBe("s1");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(wm.buildWindow).toHaveBeenCalledWith("s1", [], "test", undefined);
    });
  });

  describe("GetSessionSummaryHandler", () => {
    it("returns summary when available", async () => {
      const summarizer = {
        getLatestSummary: vi.fn().mockReturnValue({ summary: "test summary", keyTopics: ["a"] }),
      } as unknown as SessionSummarizer;
      const handler = new GetSessionSummaryHandler(summarizer);
      const result = await handler.handle({
        __requestType: "GetSessionSummary",
        sessionId: "s1",
      } as GetSessionSummaryQuery);
      expect(result).toEqual({ summary: "test summary", keyTopics: ["a"] });
    });

    it("returns undefined when no summary", async () => {
      const summarizer = {
        getLatestSummary: vi.fn().mockReturnValue(undefined),
      } as unknown as SessionSummarizer;
      const handler = new GetSessionSummaryHandler(summarizer);
      const result = await handler.handle({
        __requestType: "GetSessionSummary",
        sessionId: "s1",
      } as GetSessionSummaryQuery);
      expect(result).toBeUndefined();
    });
  });
});
