/**
 * Pipeline executor — wraps handlers in behaviors (onion model)
 * @module mediatr/pipeline
 */

import type { IPipelineBehavior, IRequest, IRequestHandler } from "./types.ts";

/**
 * Execute a request through a pipeline of behaviors, terminating at the handler.
 * Behaviors wrap in registration order: first registered = outermost.
 */
export function executePipeline<TRequest extends IRequest<TResponse>, TResponse>(
  request: TRequest,
  handler: IRequestHandler<TRequest, TResponse>,
  behaviors: IPipelineBehavior[],
): Promise<TResponse> {
  const handle = () => handler.handle(request);

  // Build onion from inside out: last behavior wraps closest to handler
  let next = handle;
  for (let i = behaviors.length - 1; i >= 0; i--) {
    const behavior = behaviors[i];
    const currentNext = next;
    next = () => behavior.handle(request, currentNext);
  }

  return next();
}
