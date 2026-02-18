/**
 * Logging pipeline behavior — structured logging of every request.
 * @module mediatr/behaviors/logging
 */

import type { IPipelineBehavior, IRequest } from "../types.ts";

export interface LogEntry {
  requestType: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export type LogSink = (entry: LogEntry) => void;

const defaultSink: LogSink = (entry) => {
  const status = entry.success ? "✓" : "✗";
  console.log(`[MediatR] ${status} ${entry.requestType} (${entry.durationMs}ms)`);
};

/** Logs every request with timing and success/failure status */
export class LoggingBehavior implements IPipelineBehavior {
  constructor(private sink: LogSink = defaultSink) {}

  async handle<TResponse>(
    request: IRequest<TResponse>,
    next: () => Promise<TResponse>,
  ): Promise<TResponse> {
    const start = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      return await next();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      this.sink({
        requestType: request.__requestType,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        success,
        error,
      });
    }
  }
}
