import { describe, it, expect, vi, beforeEach } from "vitest";
import { Mediator } from "../../../mediatr/mediator.ts";
import type { MessageReceived, FileChanged } from "../../../mediatr/notifications/domain-events.ts";
import { MessageReceivedIndexHandler, FileChangedIndexHandler } from "../notification-handlers.ts";

describe("Structured Memory Notification Handlers", () => {
  let mediator: Mediator;

  beforeEach(() => {
    mediator = new Mediator();
  });

  it("MessageReceived triggers IndexMessage via mediator.send", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new MessageReceivedIndexHandler(mediator);
    const notification: MessageReceived = {
      __notificationType: "MessageReceived",
      messageId: "m1",
      channel: "discord",
      content: "hello world",
      authorId: "u1",
      timestamp: new Date().toISOString(),
    };
    await handler.handle(notification);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__requestType).toBe("IndexMessage");
    expect(arg.content).toBe("hello world");
  });

  it("FileChanged triggers IndexMessage for non-deleted files with content", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new FileChangedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "FileChanged",
      filePath: "/test.md",
      changeType: "modified",
      content: "file content",
      timestamp: new Date().toISOString(),
    } as FileChanged);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__requestType).toBe("IndexMessage");
  });

  it("FileChanged skips deleted files", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new FileChangedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "FileChanged",
      filePath: "/test.md",
      changeType: "deleted",
      timestamp: new Date().toISOString(),
    } as FileChanged);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("FileChanged skips files without content", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new FileChangedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "FileChanged",
      filePath: "/test.md",
      changeType: "modified",
      timestamp: new Date().toISOString(),
    } as FileChanged);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
