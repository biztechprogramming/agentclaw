/**
 * Domain event (notification) interfaces for cross-feature communication.
 * @module mediatr/notifications/domain-events
 */

import type { INotification } from "../types.ts";

/** A message was received from a channel */
export interface MessageReceived extends INotification {
  readonly __notificationType: "MessageReceived";
  readonly messageId: string;
  readonly channel: string;
  readonly content: string;
  readonly authorId?: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

/** A file was created or modified */
export interface FileChanged extends INotification {
  readonly __notificationType: "FileChanged";
  readonly filePath: string;
  readonly changeType: "created" | "modified" | "deleted";
  readonly content?: string;
  readonly timestamp: string;
}

/** A task was completed */
export interface TaskCompleted extends INotification {
  readonly __notificationType: "TaskCompleted";
  readonly taskId: string;
  readonly title: string;
  readonly description?: string;
  readonly timestamp: string;
}

/** An email was received */
export interface EmailReceived extends INotification {
  readonly __notificationType: "EmailReceived";
  readonly emailId: string;
  readonly subject: string;
  readonly sender: string;
  readonly body: string;
  readonly timestamp: string;
}

/** Content was indexed into the knowledge store */
export interface ContentIndexed extends INotification {
  readonly __notificationType: "ContentIndexed";
  readonly chunkId: string;
  readonly sourceUri: string;
  readonly entityIds: string[];
}

/** A new entity was discovered during extraction */
export interface EntityDiscovered extends INotification {
  readonly __notificationType: "EntityDiscovered";
  readonly entityId: string;
  readonly name: string;
  readonly type: string;
}

/** A relationship was created between entities */
export interface RelationshipCreated extends INotification {
  readonly __notificationType: "RelationshipCreated";
  readonly relationshipId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: string;
}

/** An agent turn (request + response) was completed */
export interface AgentTurnCompleted extends INotification {
  readonly __notificationType: "AgentTurnCompleted";
  readonly sessionId: string;
  readonly turnIndex: number;
  readonly userMessage: string;
  readonly assistantMessage: string;
  readonly timestamp: string;
}

/** The context window was updated (after retrieval or compaction) */
export interface ContextWindowUpdated extends INotification {
  readonly __notificationType: "ContextWindowUpdated";
  readonly sessionId: string;
  readonly totalTokens: number;
  readonly chunkCount: number;
}
