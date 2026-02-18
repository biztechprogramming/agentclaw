import { describe, it, expect, vi, beforeEach } from "vitest";
import { Mediator } from "../../../mediatr/mediator.ts";
import type { AgentTurnCompleted } from "../../../mediatr/notifications/domain-events.ts";
import { AgentTurnCompletedHandler } from "../notification-handlers.ts";

describe("Smart Context Notification Handlers", () => {
  let mediator: Mediator;

  beforeEach(() => {
    mediator = new Mediator();
  });

  it("AgentTurnCompleted triggers summarization at compaction threshold", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const publishSpy = vi.spyOn(mediator, "publish").mockResolvedValue(undefined);
    const handler = new AgentTurnCompletedHandler(mediator, 5);

    const notification: AgentTurnCompleted = {
      __notificationType: "AgentTurnCompleted",
      sessionId: "s1",
      turnIndex: 5,
      userMessage: "hello",
      assistantMessage: "hi",
      timestamp: new Date().toISOString(),
    };
    await handler.handle(notification);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__requestType).toBe("SummarizeTurns");
    // Always publishes ContextWindowUpdated
    expect(publishSpy).toHaveBeenCalled();
  });

  it("AgentTurnCompleted skips summarization when not at threshold", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const publishSpy = vi.spyOn(mediator, "publish").mockResolvedValue(undefined);
    const handler = new AgentTurnCompletedHandler(mediator, 5);

    await handler.handle({
      __notificationType: "AgentTurnCompleted",
      sessionId: "s1",
      turnIndex: 3,
      userMessage: "hello",
      assistantMessage: "hi",
      timestamp: new Date().toISOString(),
    } as AgentTurnCompleted);
    expect(sendSpy).not.toHaveBeenCalled();
    // Still publishes ContextWindowUpdated
    expect(publishSpy).toHaveBeenCalled();
  });

  it("always emits ContextWindowUpdated", async () => {
    const publishSpy = vi.spyOn(mediator, "publish").mockResolvedValue(undefined);
    const handler = new AgentTurnCompletedHandler(mediator, 100);
    await handler.handle({
      __notificationType: "AgentTurnCompleted",
      sessionId: "s1",
      turnIndex: 1,
      userMessage: "x",
      assistantMessage: "y",
      timestamp: new Date().toISOString(),
    } as AgentTurnCompleted);
    const call = publishSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(call.__notificationType).toBe("ContextWindowUpdated");
  });
});
