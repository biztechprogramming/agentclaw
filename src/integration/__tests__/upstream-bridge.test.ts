import { describe, it, expect, vi, beforeEach } from "vitest";
import { Mediator } from "../../mediatr/mediator.ts";
import { UpstreamBridge } from "../upstream-bridge.ts";

describe("UpstreamBridge", () => {
  let mediator: Mediator;
  let bridge: UpstreamBridge;

  beforeEach(() => {
    mediator = new Mediator();
    bridge = new UpstreamBridge(mediator);
  });

  it("onHook publishes notification with hook: prefix", async () => {
    const publishSpy = vi.spyOn(mediator, "publish").mockResolvedValue(undefined);
    await bridge.onHook({ name: "message_sent", payload: { text: "hi" } });
    expect(publishSpy).toHaveBeenCalledOnce();
    const arg = publishSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.__notificationType).toBe("hook:message_sent");
    expect(arg.hookName).toBe("message_sent");
    expect(arg.payload).toEqual({ text: "hi" });
  });

  it("onHook uses provided timestamp", async () => {
    const publishSpy = vi.spyOn(mediator, "publish").mockResolvedValue(undefined);
    await bridge.onHook({ name: "test", payload: {}, timestamp: 12345 });
    const arg = publishSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.timestamp).toBe(12345);
  });

  it("onHookType registers handler and fires on hook", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    bridge.onHookType("custom_hook", fn);
    await bridge.onHook({ name: "custom_hook", payload: { key: "val" } });
    expect(fn).toHaveBeenCalledWith({ key: "val" });
  });
});
