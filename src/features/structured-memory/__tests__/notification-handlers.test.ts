import { describe, it, expect, vi, beforeEach } from "vitest";
import { Mediator } from "../../../mediatr/mediator.ts";
import type {
  MessageReceived,
  FileChanged,
  TaskCompleted,
  EmailReceived,
} from "../../../mediatr/notifications/domain-events.ts";
import {
  MessageReceivedIndexHandler,
  FileChangedIndexHandler,
  TaskCompletedIndexHandler,
  EmailReceivedIndexHandler,
} from "../notification-handlers.ts";

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

  it("TaskCompleted triggers IndexMessage with formatted content", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new TaskCompletedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "TaskCompleted",
      taskId: "t1",
      title: "Fix the bug",
      description: "Memory leak in indexer",
      timestamp: new Date().toISOString(),
    } as TaskCompleted);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__requestType).toBe("IndexMessage");
    expect(arg.sourceUri).toBe("task://t1");
    expect(arg.content).toContain("Fix the bug");
    expect(arg.content).toContain("Memory leak in indexer");
  });

  it("TaskCompleted works without description", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new TaskCompletedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "TaskCompleted",
      taskId: "t2",
      title: "Deploy v2",
      timestamp: new Date().toISOString(),
    } as TaskCompleted);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.content).toBe("Task completed: Deploy v2");
  });

  it("EmailReceived triggers IndexMessage with from/subject/body", async () => {
    const sendSpy = vi.spyOn(mediator, "send").mockResolvedValue(undefined as never);
    const handler = new EmailReceivedIndexHandler(mediator);
    await handler.handle({
      __notificationType: "EmailReceived",
      emailId: "em1",
      sender: "alice@example.com",
      subject: "Project update",
      body: "Everything is on track.",
      timestamp: new Date().toISOString(),
    } as EmailReceived);
    expect(sendSpy).toHaveBeenCalledOnce();
    const arg = sendSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__requestType).toBe("IndexMessage");
    expect(arg.sourceUri).toBe("email://em1");
    expect(arg.content).toContain("alice@example.com");
    expect(arg.content).toContain("Project update");
    expect(arg.content).toContain("Everything is on track.");
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
