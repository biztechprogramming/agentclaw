/**
 * Notification handlers for Smart Context.
 * @module features/smart-context/notification-handlers
 */

import type { Mediator } from "../../mediatr/mediator.ts";
import type {
  AgentTurnCompleted,
  ContextWindowUpdated,
} from "../../mediatr/notifications/domain-events.ts";
import type { INotificationHandler } from "../../mediatr/types.ts";
import type { SummarizeTurnsCommand } from "./commands.ts";
import type { SummarizationResult } from "./types.ts";

/**
 * On AgentTurnCompleted, check if summarization is needed
 * and emit ContextWindowUpdated.
 */
export class AgentTurnCompletedHandler implements INotificationHandler<AgentTurnCompleted> {
  private readonly compactionThreshold: number;

  constructor(
    private readonly mediator: Mediator,
    compactionThreshold = 20,
  ) {
    this.compactionThreshold = compactionThreshold;
  }

  async handle(notification: AgentTurnCompleted): Promise<void> {
    // Only trigger summarization every N turns
    if (notification.turnIndex > 0 && notification.turnIndex % this.compactionThreshold === 0) {
      const turns = [
        { role: "user", content: notification.userMessage },
        { role: "assistant", content: notification.assistantMessage },
      ];

      await this.mediator.send<SummarizationResult>({
        __requestType: "SummarizeTurns",
        sessionId: notification.sessionId,
        turns,
      } as SummarizeTurnsCommand);
    }

    // Always emit ContextWindowUpdated
    await this.mediator.publish({
      __notificationType: "ContextWindowUpdated",
      sessionId: notification.sessionId,
      totalTokens: 0, // actual count determined by window manager
      chunkCount: 0,
    } as ContextWindowUpdated);
  }
}
