/**
 * Mediator — central dispatcher for commands, queries, and notifications.
 * @module mediatr/mediator
 */

import { executePipeline } from "./pipeline.ts";
import type {
  INotification,
  INotificationHandler,
  IPipelineBehavior,
  IRequest,
  IRequestHandler,
} from "./types.ts";

/**
 * The Mediator dispatches requests to their registered handler through a
 * pipeline of behaviors, and publishes notifications to all registered handlers.
 */
export class Mediator {
  private handlers = new Map<string, IRequestHandler<IRequest<unknown>, unknown>>();
  private notificationHandlers = new Map<string, INotificationHandler<INotification>[]>();
  private behaviors: IPipelineBehavior[] = [];

  /** Register a request handler for a given request type name */
  registerHandler<TRequest extends IRequest<TResponse>, TResponse>(
    requestType: string,
    handler: IRequestHandler<TRequest, TResponse>,
  ): void {
    if (this.handlers.has(requestType)) {
      throw new Error(`Handler already registered for request type: ${requestType}`);
    }
    this.handlers.set(requestType, handler);
  }

  /** Register a notification handler for a given notification type name */
  registerNotificationHandler<TNotification extends INotification>(
    notificationType: string,
    handler: INotificationHandler<TNotification>,
  ): void {
    const existing = this.notificationHandlers.get(notificationType) ?? [];
    existing.push(handler);
    this.notificationHandlers.set(notificationType, existing);
  }

  /** Add a pipeline behavior (executed in registration order, outermost first) */
  addBehavior(behavior: IPipelineBehavior): void {
    this.behaviors.push(behavior);
  }

  /**
   * Send a request through the pipeline to its handler.
   * @throws Error if no handler is registered for the request type.
   */
  async send<TResponse>(request: IRequest<TResponse>): Promise<TResponse> {
    const handler = this.handlers.get(request.__requestType);
    if (!handler) {
      throw new Error(`No handler registered for request type: ${request.__requestType}`);
    }
    return executePipeline(request, handler, this.behaviors);
  }

  /**
   * Publish a notification to all registered handlers.
   * All handlers run concurrently. Errors are collected but do not prevent other handlers.
   */
  async publish(notification: INotification): Promise<void> {
    const handlers = this.notificationHandlers.get(notification.__notificationType) ?? [];
    const errors: Error[] = [];

    await Promise.all(
      handlers.map((h) =>
        h.handle(notification).catch((err: unknown) => {
          errors.push(err instanceof Error ? err : new Error(String(err)));
        }),
      ),
    );

    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, `${errors.length} notification handler(s) failed`);
    }
  }
}
