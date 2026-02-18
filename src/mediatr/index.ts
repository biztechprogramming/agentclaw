/**
 * MediatR Pipeline — public API
 * @module mediatr
 */

export { Mediator } from "./mediator.ts";
export { executePipeline } from "./pipeline.ts";
export type {
  INotification,
  INotificationHandler,
  IPipelineBehavior,
  IRequest,
  IRequestHandler,
  IRequestWithMetadata,
  RequestMetadata,
} from "./types.ts";
export { LoggingBehavior } from "./behaviors/logging.behavior.ts";
export type { LogEntry, LogSink } from "./behaviors/logging.behavior.ts";
export { ValidationBehavior, ValidationError } from "./behaviors/validation.behavior.ts";
export type { IValidator, ValidationResult } from "./behaviors/validation.behavior.ts";
export { MetricsBehavior } from "./behaviors/metrics.behavior.ts";
export type { MetricsEntry } from "./behaviors/metrics.behavior.ts";
