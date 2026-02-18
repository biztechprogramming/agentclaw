/**
 * Upstream Bridge — adapts OpenClaw's hook system to MediatR pipeline.
 * @module integration/upstream-bridge
 */

import type { Mediator } from "../mediatr/mediator.ts";
import type { INotification } from "../mediatr/types.ts";

/** Generic hook event from OpenClaw */
export interface HookEvent {
  name: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

/** Notification wrapper for upstream hook events */
export interface HookNotification extends INotification {
  __notificationType: string;
  hookName: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

/**
 * Bridges OpenClaw's hook system to the MediatR pipeline.
 * Register this with OpenClaw's hook registry; it forwards events as MediatR notifications.
 */
export class UpstreamBridge {
  constructor(private mediator: Mediator) {}

  /**
   * Called when OpenClaw fires a hook. Converts to a MediatR notification
   * and publishes it to all registered handlers.
   */
  async onHook(event: HookEvent): Promise<void> {
    const notification: HookNotification = {
      __notificationType: `hook:${event.name}`,
      hookName: event.name,
      payload: event.payload,
      timestamp: event.timestamp ?? Date.now(),
    };
    await this.mediator.publish(notification);
  }

  /**
   * Convenience: register a handler for a specific OpenClaw hook.
   */
  onHookType(hookName: string, handler: (payload: Record<string, unknown>) => Promise<void>): void {
    this.mediator.registerNotificationHandler(`hook:${hookName}`, {
      handle: async (notification: HookNotification) => {
        await handler(notification.payload);
      },
    });
  }
}
