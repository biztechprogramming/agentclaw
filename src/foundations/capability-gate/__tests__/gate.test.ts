import { describe, expect, it, afterEach } from "vitest";
import { Mediator } from "../../../mediatr/mediator.ts";
import { KnowledgeStore } from "../../knowledge-store/store.ts";
import { CapabilityGateBehavior } from "../behavior.ts";
import { CapabilityGate } from "../gate.ts";
import { CapabilityDeniedError, ApprovalRequiredError } from "../types.ts";

describe("CapabilityGate", () => {
  let store: KnowledgeStore;

  afterEach(() => {
    store?.close();
  });

  it("allows when no policies exist (default open)", () => {
    store = new KnowledgeStore();
    const gate = new CapabilityGate(store);
    expect(() => gate.check("send_email", { channel: "discord" })).not.toThrow();
  });

  it("denies when deny policy matches", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "deny" });
    const gate = new CapabilityGate(store);
    expect(() => gate.check("send_email", {})).toThrow(CapabilityDeniedError);
  });

  it("requires approval when policy says so", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "make_purchase", effect: "approval_required" });
    const gate = new CapabilityGate(store);
    expect(() => gate.check("make_purchase", {})).toThrow(ApprovalRequiredError);
  });

  it("more specific policy wins", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "deny" });
    store.insertPolicy({ id: "p2", capability: "send_email", effect: "allow", channel: "discord" });
    const gate = new CapabilityGate(store);

    // Specific allow for discord overrides general deny
    expect(() => gate.check("send_email", { channel: "discord" })).not.toThrow();
    // General deny still applies to other channels
    expect(() => gate.check("send_email", { channel: "slack" })).toThrow(CapabilityDeniedError);
  });

  it("channel+persona policy beats channel-only policy", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "allow", channel: "discord" });
    store.insertPolicy({
      id: "p2",
      capability: "send_email",
      effect: "deny",
      channel: "discord",
      persona: "bot",
    });
    const gate = new CapabilityGate(store);

    // channel+persona match is more specific → deny
    expect(() => gate.check("send_email", { channel: "discord", persona: "bot" })).toThrow(
      CapabilityDeniedError,
    );
    // channel-only match → allow
    expect(() => gate.check("send_email", { channel: "discord", persona: "admin" })).not.toThrow();
  });

  it("default allows when no policies match the capability", () => {
    store = new KnowledgeStore();
    // Policy for a different capability
    store.insertPolicy({ id: "p1", capability: "make_purchase", effect: "deny" });
    const gate = new CapabilityGate(store);
    expect(() => gate.check("send_email", { channel: "discord" })).not.toThrow();
  });

  it("deny wins ties at same specificity", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "allow", channel: "discord" });
    store.insertPolicy({ id: "p2", capability: "send_email", effect: "deny", channel: "discord" });
    const gate = new CapabilityGate(store);
    expect(() => gate.check("send_email", { channel: "discord" })).toThrow(CapabilityDeniedError);
  });

  it("approval_required wins over allow at same specificity", () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "allow", channel: "discord" });
    store.insertPolicy({
      id: "p2",
      capability: "send_email",
      effect: "approval_required",
      channel: "discord",
    });
    const gate = new CapabilityGate(store);
    expect(() => gate.check("send_email", { channel: "discord" })).toThrow(ApprovalRequiredError);
  });

  it("logs audit entries for checks", () => {
    store = new KnowledgeStore();
    const gate = new CapabilityGate(store);
    gate.check("read_file", { userId: "user1" });

    const logs = store.db
      .prepare("SELECT * FROM audit_log WHERE action = ?")
      .all("capability_check");
    expect(logs).toHaveLength(1);
  });
});

describe("CapabilityGateBehavior", () => {
  let store: KnowledgeStore;

  afterEach(() => {
    store?.close();
  });

  it("blocks requests with denied capabilities in pipeline", async () => {
    store = new KnowledgeStore();
    store.insertPolicy({ id: "p1", capability: "send_email", effect: "deny" });

    const gate = new CapabilityGate(store);
    const mediator = new Mediator();
    mediator.addBehavior(new CapabilityGateBehavior(gate, () => ({ channel: "test" })));
    mediator.registerHandler("SendEmail", { handle: async () => "sent" });

    await expect(
      mediator.send({
        __requestType: "SendEmail",
        __metadata: { requiredCapabilities: ["send_email"] },
      } as unknown),
    ).rejects.toThrow(CapabilityDeniedError);
  });

  it("allows requests without capability metadata", async () => {
    store = new KnowledgeStore();
    const gate = new CapabilityGate(store);
    const mediator = new Mediator();
    mediator.addBehavior(new CapabilityGateBehavior(gate, () => ({})));
    mediator.registerHandler("Ping", { handle: async () => "pong" });

    const result = await mediator.send({ __requestType: "Ping" } as unknown);
    expect(result).toBe("pong");
  });
});
