/**
 * CapabilityGate — evaluates whether a context has a required capability.
 * @module foundations/capability-gate/gate
 */

import { randomUUID } from "node:crypto";
import type { KnowledgeStore } from "../knowledge-store/store.ts";
import type { CapabilityContext, Policy, PolicyEffect } from "./types.ts";
import { ApprovalRequiredError, CapabilityDeniedError } from "./types.ts";

export class CapabilityGate {
  constructor(private store: KnowledgeStore) {}

  /**
   * Check if a capability is allowed in the given context.
   * @throws CapabilityDeniedError if hard denied
   * @throws ApprovalRequiredError if approval is needed
   */
  check(capability: string, context: CapabilityContext): void {
    const policies = this.store.getPolicies(capability) as Policy[];
    const effect = this.evaluate(policies, context);

    // Log the decision
    this.store.logAudit({
      id: randomUUID(),
      action: "capability_check",
      actor: context.userId ?? context.persona ?? "unknown",
      target: capability,
      details: { context, effect, policyCount: policies.length },
    });

    if (effect === "deny") {
      throw new CapabilityDeniedError(capability, context);
    }
    if (effect === "approval_required") {
      throw new ApprovalRequiredError(capability, context);
    }
  }

  /**
   * Evaluate policies and return the effective decision.
   * Most specific matching policy wins. Deny > approval_required > allow.
   * No matching policies = allow (default open).
   */
  private evaluate(policies: Policy[], context: CapabilityContext): PolicyEffect {
    if (policies.length === 0) {
      return "allow";
    }

    // Score policies by specificity (more matching fields = more specific)
    let bestScore = -1;
    let bestEffect: PolicyEffect = "allow";

    for (const policy of policies) {
      let score = 0;
      let matches = true;

      if (policy.channel) {
        if (policy.channel === context.channel) {
          score++;
        } else {
          matches = false;
          continue;
        }
      }
      if (policy.persona) {
        if (policy.persona === context.persona) {
          score++;
        } else {
          matches = false;
          continue;
        }
      }
      if (policy.userId) {
        if (policy.userId === context.userId) {
          score++;
        } else {
          matches = false;
          continue;
        }
      }

      if (matches && score > bestScore) {
        bestScore = score;
        bestEffect = policy.effect;
      } else if (matches && score === bestScore) {
        // Deny wins ties
        if (policy.effect === "deny") {
          bestEffect = "deny";
        } else if (policy.effect === "approval_required" && bestEffect === "allow") {
          bestEffect = "approval_required";
        }
      }
    }

    return bestEffect;
  }
}
