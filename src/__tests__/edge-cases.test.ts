import { describe, it, expect, afterEach } from "vitest";
import { hybridSearch } from "../foundations/knowledge-store/search.ts";
import { KnowledgeStore } from "../foundations/knowledge-store/store.ts";
import { Mediator } from "../mediatr/mediator.ts";
import { executePipeline } from "../mediatr/pipeline.ts";
import type { IRequest } from "../mediatr/types.ts";

describe("Edge cases", () => {
  let store: KnowledgeStore;

  afterEach(() => {
    store?.close();
  });

  it("empty string search does not crash", async () => {
    store = new KnowledgeStore();
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: "some content" });
    const results = await hybridSearch(store.db, { query: "" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("very long text chunks correctly", async () => {
    store = new KnowledgeStore();
    const longText = "word ".repeat(500);
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: longText });
    const chunk = store.getChunk("c1");
    expect(chunk).toBeDefined();
    expect((chunk!.content as string).length).toBe(longText.length);
  });

  it("unicode content in FTS does not crash", async () => {
    store = new KnowledgeStore();
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: "日本語テスト検索" });
    // FTS5 tokenizer may not support CJK well, but should not crash
    await expect(hybridSearch(store.db, { query: "日本語" })).resolves.not.toThrow();
  });

  it("special FTS characters in query do not crash", async () => {
    store = new KnowledgeStore();
    await store.insertChunk({ id: "c1", sourceUri: "t://1", content: "test content here" });
    // These would normally break FTS5 if not handled
    await expect(hybridSearch(store.db, { query: '"unmatched' })).resolves.not.toThrow();
    await expect(hybridSearch(store.db, { query: "foo(bar)" })).resolves.not.toThrow();
    await expect(hybridSearch(store.db, { query: "OR AND NOT" })).resolves.not.toThrow();
  });

  it("handler throwing propagates through pipeline", async () => {
    const req: IRequest<string> = { __requestType: "Boom" };
    const handler = {
      handle: async () => {
        throw new Error("handler error");
      },
    };
    await expect(executePipeline(req, handler, [])).rejects.toThrow("handler error");
  });

  it("notification handler throwing does not break other handlers", async () => {
    const mediator = new Mediator();
    const results: string[] = [];
    mediator.registerNotificationHandler("test", {
      handle: async () => {
        throw new Error("handler1 fail");
      },
    });
    mediator.registerNotificationHandler("test", {
      handle: async () => {
        results.push("handler2 ok");
      },
    });
    // Should throw (aggregated) but handler2 still runs
    await expect(mediator.publish({ __notificationType: "test" })).rejects.toThrow();
    expect(results).toContain("handler2 ok");
  });
});
