import { describe, expect, it } from "vitest";
import { LoggingBehavior } from "../behaviors/logging.behavior.ts";
import { MetricsBehavior } from "../behaviors/metrics.behavior.ts";
import { ValidationBehavior, ValidationError } from "../behaviors/validation.behavior.ts";
import { Mediator } from "../mediator.ts";
import type { INotification, IRequest, IPipelineBehavior } from "../types.ts";

// --- Test fixtures ---

interface Ping extends IRequest<string> {
  __requestType: "Ping";
  message: string;
}

interface UserCreated extends INotification {
  __notificationType: "UserCreated";
  userId: string;
}

describe("Mediator", () => {
  it("sends a request to its handler", async () => {
    const m = new Mediator();
    m.registerHandler<Ping, string>("Ping", {
      handle: async (req) => `pong: ${req.message}`,
    });

    const result = await m.send<string>({ __requestType: "Ping", message: "hello" } as Ping);
    expect(result).toBe("pong: hello");
  });

  it("throws when no handler registered", async () => {
    const m = new Mediator();
    await expect(m.send({ __requestType: "Unknown" })).rejects.toThrow("No handler registered");
  });

  it("throws on duplicate handler registration", () => {
    const m = new Mediator();
    m.registerHandler("Ping", { handle: async () => {} });
    expect(() => m.registerHandler("Ping", { handle: async () => {} })).toThrow(
      "already registered",
    );
  });

  it("publishes notifications to multiple handlers", async () => {
    const m = new Mediator();
    const calls: string[] = [];

    m.registerNotificationHandler<UserCreated>("UserCreated", {
      handle: async (n) => {
        calls.push(`a:${n.userId}`);
      },
    });
    m.registerNotificationHandler<UserCreated>("UserCreated", {
      handle: async (n) => {
        calls.push(`b:${n.userId}`);
      },
    });

    await m.publish({ __notificationType: "UserCreated", userId: "42" } as UserCreated);
    expect(calls).toContain("a:42");
    expect(calls).toContain("b:42");
  });

  it("publishes to zero handlers without error", async () => {
    const m = new Mediator();
    await m.publish({ __notificationType: "Nothing" });
  });

  it("collects notification handler errors", async () => {
    const m = new Mediator();
    m.registerNotificationHandler("Fail", {
      handle: async () => {
        throw new Error("boom");
      },
    });
    await expect(m.publish({ __notificationType: "Fail" })).rejects.toThrow("boom");
  });

  it("executes behaviors in onion order", async () => {
    const m = new Mediator();
    const order: string[] = [];

    const makeBehavior = (name: string): IPipelineBehavior => ({
      async handle(_req, next) {
        order.push(`${name}:before`);
        const result = await next();
        order.push(`${name}:after`);
        return result;
      },
    });

    m.addBehavior(makeBehavior("outer"));
    m.addBehavior(makeBehavior("inner"));
    m.registerHandler<Ping, string>("Ping", {
      handle: async () => {
        order.push("handler");
        return "done";
      },
    });

    await m.send<string>({ __requestType: "Ping", message: "" } as Ping);
    expect(order).toEqual([
      "outer:before",
      "inner:before",
      "handler",
      "inner:after",
      "outer:after",
    ]);
  });

  it("logging behavior captures entries", async () => {
    const m = new Mediator();
    const entries: unknown[] = [];
    m.addBehavior(new LoggingBehavior((e) => entries.push(e)));
    m.registerHandler("Ping", { handle: async () => "ok" });

    await m.send({ __requestType: "Ping" } as unknown);
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(true);
    expect(entries[0].requestType).toBe("Ping");
  });

  it("metrics behavior tracks timing", async () => {
    const m = new Mediator();
    const metrics = new MetricsBehavior();
    m.addBehavior(metrics);
    m.registerHandler("Ping", { handle: async () => "ok" });

    await m.send({ __requestType: "Ping" } as unknown);
    const entries = metrics.getMetrics();
    expect(entries).toHaveLength(1);
    expect(entries[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("validation behavior rejects invalid requests", async () => {
    const m = new Mediator();
    m.addBehavior(
      new ValidationBehavior({
        validate: () => ({ success: false, errors: ["bad field"] }),
      }),
    );
    m.registerHandler("Ping", { handle: async () => "ok" });

    await expect(
      m.send({ __requestType: "Ping", __metadata: { validationSchema: {} } } as unknown),
    ).rejects.toThrow(ValidationError);
  });
});
