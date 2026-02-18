/**
 * Capability Gate — public API
 * @module foundations/capability-gate
 */

export { CapabilityGate } from "./gate.ts";
export { CapabilityGateBehavior } from "./behavior.ts";
export { Capability, CapabilityDeniedError, ApprovalRequiredError } from "./types.ts";
export type { CapabilityString, CapabilityContext, Policy, PolicyEffect } from "./types.ts";
