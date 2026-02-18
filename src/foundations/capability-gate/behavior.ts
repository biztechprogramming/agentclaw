/**
 * Capability Gate pipeline behavior — checks capabilities before handler execution.
 * @module foundations/capability-gate/behavior
 */

import type { IPipelineBehavior, IRequest, IRequestWithMetadata } from "../../mediatr/types.ts";
import type { CapabilityGate } from "./gate.ts";
import type { CapabilityContext } from "./types.ts";

/**
 * MediatR pipeline behavior that enforces capability policies.
 * Reads required capabilities from request metadata and checks each one.
 */
export class CapabilityGateBehavior implements IPipelineBehavior {
  constructor(
    private gate: CapabilityGate,
    private contextProvider: () => CapabilityContext,
  ) {}

  async handle<TResponse>(
    request: IRequest<TResponse>,
    next: () => Promise<TResponse>,
  ): Promise<TResponse> {
    const meta = (request as IRequestWithMetadata<TResponse>).__metadata;
    const required = meta?.requiredCapabilities;

    if (required && required.length > 0) {
      const context = this.contextProvider();
      for (const capability of required) {
        this.gate.check(capability, context);
      }
    }

    return next();
  }
}
