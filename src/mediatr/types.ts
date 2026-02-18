/**
 * MediatR Pipeline Core — Type definitions
 * @module mediatr/types
 */

/** Marker for request type discrimination */
export interface IRequest<TResponse = void> {
  /** Unique type name used for handler registry lookup */
  readonly __requestType: string;
  /** Phantom type brand — not used at runtime */
  readonly __responseType?: TResponse;
}

/** Handler for a specific request type */
export interface IRequestHandler<TRequest extends IRequest<TResponse>, TResponse = void> {
  handle(request: TRequest): Promise<TResponse>;
}

/** Marker for notification type discrimination */
export interface INotification {
  readonly __notificationType: string;
}

/** Handler for notifications — zero or more per notification type */
export interface INotificationHandler<TNotification extends INotification> {
  handle(notification: TNotification): Promise<void>;
}

/**
 * Pipeline behavior wrapping request execution (onion model).
 * Called in registration order; must invoke `next()` to continue.
 */
export interface IPipelineBehavior {
  handle<TResponse>(
    request: IRequest<TResponse>,
    next: () => Promise<TResponse>,
  ): Promise<TResponse>;
}

/** Metadata that can be attached to requests for cross-cutting concerns */
export interface RequestMetadata {
  /** Required capabilities for capability gate */
  requiredCapabilities?: string[];
  /** Validation schema (Zod or similar) */
  validationSchema?: unknown;
  /** Arbitrary metadata */
  [key: string]: unknown;
}

/** Extended request with optional metadata */
export interface IRequestWithMetadata<TResponse = void> extends IRequest<TResponse> {
  readonly __metadata?: RequestMetadata;
}
