import { describe, it, expect } from "vitest";
import { LoggingBehavior, type LogEntry } from "../behaviors/logging.behavior.ts";
import { MetricsBehavior } from "../behaviors/metrics.behavior.ts";
import {
  ValidationBehavior,
  ValidationError,
  type IValidator,
} from "../behaviors/validation.behavior.ts";
import { executePipeline } from "../pipeline.ts";
import type { IRequest } from "../types.ts";

const makeRequest = (type: string, meta?: Record<string, unknown>): IRequest<string> =>
  ({
    __requestType: type,
    ...(meta ? { __metadata: meta } : {}),
  }) as IRequest<string>;

describe("MetricsBehavior", () => {
  it("records metrics and getMetricsFor filters", async () => {
    const m = new MetricsBehavior();
    await m.handle(makeRequest("A"), async () => "ok");
    await m.handle(makeRequest("B"), async () => "ok");
    await m.handle(makeRequest("A"), async () => "ok");
    expect(m.getMetrics()).toHaveLength(3);
    expect(m.getMetricsFor("A")).toHaveLength(2);
    expect(m.getMetricsFor("B")).toHaveLength(1);
  });

  it("clear() empties metrics", async () => {
    const m = new MetricsBehavior();
    await m.handle(makeRequest("X"), async () => "ok");
    m.clear();
    expect(m.getMetrics()).toHaveLength(0);
  });

  it("records success=false on error", async () => {
    const m = new MetricsBehavior();
    await expect(
      m.handle(makeRequest("F"), async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(m.getMetricsFor("F")[0].success).toBe(false);
  });
});

describe("LoggingBehavior", () => {
  it("logs error path with success=false", async () => {
    const entries: LogEntry[] = [];
    const l = new LoggingBehavior((e) => entries.push(e));
    await expect(
      l.handle(makeRequest("X"), async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(false);
    expect(entries[0].error).toBe("fail");
  });

  it("logs success path", async () => {
    const entries: LogEntry[] = [];
    const l = new LoggingBehavior((e) => entries.push(e));
    await l.handle(makeRequest("Y"), async () => "ok");
    expect(entries[0].success).toBe(true);
    expect(entries[0].error).toBeUndefined();
  });
});

describe("ValidationBehavior", () => {
  it("passes when no schema present", async () => {
    const v = new ValidationBehavior();
    const result = await v.handle(makeRequest("X"), async () => "ok");
    expect(result).toBe("ok");
  });

  it("passes when no validator configured", async () => {
    const req = makeRequest("X", { validationSchema: { type: "object" } });
    const v = new ValidationBehavior();
    const result = await v.handle(req, async () => "ok");
    expect(result).toBe("ok");
  });

  it("throws ValidationError when validation fails", async () => {
    const validator: IValidator = { validate: () => ({ success: false, errors: ["bad field"] }) };
    const v = new ValidationBehavior(validator);
    const req = makeRequest("X", { validationSchema: { type: "object" } });
    await expect(v.handle(req, async () => "ok")).rejects.toThrow(ValidationError);
  });

  it("passes when validation succeeds", async () => {
    const validator: IValidator = { validate: () => ({ success: true }) };
    const v = new ValidationBehavior(validator);
    const req = makeRequest("X", { validationSchema: { type: "object" } });
    const result = await v.handle(req, async () => "ok");
    expect(result).toBe("ok");
  });
});

describe("Pipeline error propagation", () => {
  it("behavior error bubbles up", async () => {
    const badBehavior = {
      handle: async () => {
        throw new Error("behavior boom");
      },
    };
    const handler = { handle: async () => "ok" };
    await expect(executePipeline(makeRequest("X"), handler, [badBehavior])).rejects.toThrow(
      "behavior boom",
    );
  });
});
