/**
 * Notification handlers for Structured Memory — auto-index on domain events.
 * @module features/structured-memory/notification-handlers
 */

import type { Mediator } from "../../mediatr/mediator.ts";
import type {
  MessageReceived,
  FileChanged,
  TaskCompleted,
  EmailReceived,
} from "../../mediatr/notifications/domain-events.ts";
import type { INotificationHandler } from "../../mediatr/types.ts";
import type { IndexMessageCommand } from "./commands.ts";
import type { MemoryEntry } from "./types.ts";

/** Indexes incoming messages */
export class MessageReceivedIndexHandler implements INotificationHandler<MessageReceived> {
  constructor(private readonly mediator: Mediator) {}

  async handle(notification: MessageReceived): Promise<void> {
    await this.mediator.send<MemoryEntry>({
      __requestType: "IndexMessage",
      sourceUri: `message://${notification.channel}/${notification.messageId}`,
      content: notification.content,
      metadata: { authorId: notification.authorId, channel: notification.channel },
    } as IndexMessageCommand);
  }
}

/** Indexes file changes */
export class FileChangedIndexHandler implements INotificationHandler<FileChanged> {
  constructor(private readonly mediator: Mediator) {}

  async handle(notification: FileChanged): Promise<void> {
    if (notification.changeType === "deleted" || !notification.content) {
      return;
    }
    await this.mediator.send<MemoryEntry>({
      __requestType: "IndexMessage",
      sourceUri: `file://${notification.filePath}`,
      content: notification.content,
    } as IndexMessageCommand);
  }
}

/** Indexes completed tasks */
export class TaskCompletedIndexHandler implements INotificationHandler<TaskCompleted> {
  constructor(private readonly mediator: Mediator) {}

  async handle(notification: TaskCompleted): Promise<void> {
    const content = `Task completed: ${notification.title}${notification.description ? ` — ${notification.description}` : ""}`;
    await this.mediator.send<MemoryEntry>({
      __requestType: "IndexMessage",
      sourceUri: `task://${notification.taskId}`,
      content,
    } as IndexMessageCommand);
  }
}

/** Indexes received emails */
export class EmailReceivedIndexHandler implements INotificationHandler<EmailReceived> {
  constructor(private readonly mediator: Mediator) {}

  async handle(notification: EmailReceived): Promise<void> {
    const content = `From: ${notification.sender}\nSubject: ${notification.subject}\n\n${notification.body}`;
    await this.mediator.send<MemoryEntry>({
      __requestType: "IndexMessage",
      sourceUri: `email://${notification.emailId}`,
      content,
      metadata: { sender: notification.sender, subject: notification.subject },
    } as IndexMessageCommand);
  }
}
