/**
 * Metrics pipeline behavior — timing and tracking of requests.
 * @module mediatr/behaviors/metrics
 */

import type { IPipelineBehavior, IRequest } from "../types.ts";

export interface MetricsEntry {
  requestType: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
}

/** Collects timing metrics for all requests passing through the pipeline */
export class MetricsBehavior implements IPipelineBehavior {
  private entries: MetricsEntry[] = [];

  async handle<TResponse>(
    request: IRequest<TResponse>,
    next: () => Promise<TResponse>,
  ): Promise<TResponse> {
    const start = performance.now();
    let success = true;

    try {
      return await next();
    } catch (err) {
      success = false;
      throw err;
    } finally {
      this.entries.push({
        requestType: request.__requestType,
        durationMs: performance.now() - start,
        timestamp: Date.now(),
        success,
      });
    }
  }

  /** Get all collected metrics */
  getMetrics(): readonly MetricsEntry[] {
    return this.entries;
  }

  /** Get metrics for a specific request type */
  getMetricsFor(requestType: string): MetricsEntry[] {
    return this.entries.filter((e) => e.requestType === requestType);
  }

  /** Clear collected metrics */
  clear(): void {
    this.entries = [];
  }
}
