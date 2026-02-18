/**
 * Capability Gate — type definitions
 * @module foundations/capability-gate/types
 */

/** Well-known capabilities */
export const Capability = {
  SEND_EMAIL: "send_email",
  SEND_MESSAGE: "send_message",
  READ_FILE: "read_file",
  WRITE_FILE: "write_file",
  EXECUTE_COMMAND: "execute_command",
  BROWSE_WEB: "browse_web",
  MANAGE_CALENDAR: "manage_calendar",
  MAKE_PURCHASE: "make_purchase",
  ACCESS_CONTACTS: "access_contacts",
  MODIFY_SETTINGS: "modify_settings",
} as const;

export type CapabilityString = string;

/** Policy effect */
export type PolicyEffect = "allow" | "deny" | "approval_required";

/** A capability policy from the knowledge store */
export interface Policy {
  id: string;
  capability: string;
  channel?: string | null;
  persona?: string | null;
  userId?: string | null;
  effect: PolicyEffect;
  conditions?: Record<string, unknown>;
}

/** Context for capability evaluation */
export interface CapabilityContext {
  channel?: string;
  persona?: string;
  userId?: string;
  requestType?: string;
}

/** Thrown when a capability is hard-denied */
export class CapabilityDeniedError extends Error {
  constructor(
    public readonly capability: string,
    public readonly context: CapabilityContext,
  ) {
    super(`Capability denied: ${capability}`);
    this.name = "CapabilityDeniedError";
  }
}

/** Thrown when a capability requires approval */
export class ApprovalRequiredError extends Error {
  constructor(
    public readonly capability: string,
    public readonly context: CapabilityContext,
  ) {
    super(`Approval required for capability: ${capability}`);
    this.name = "ApprovalRequiredError";
  }
}
