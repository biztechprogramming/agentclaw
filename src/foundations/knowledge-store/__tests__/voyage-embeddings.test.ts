import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoyageEmbeddingProvider } from "../voyage-embeddings.ts";

describe("VoyageEmbeddingProvider", () => {
  const originalEnv = process.env.VOYAGE_API_KEY;
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.VOYAGE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.VOYAGE_API_KEY = originalEnv;
    } else {
      delete process.env.VOYAGE_API_KEY;
    }
    vi.restoreAllMocks();
  });

  it("throws if no API key provided", () => {
    delete process.env.VOYAGE_API_KEY;
    expect(() => new VoyageEmbeddingProvider()).toThrow("Voyage API key required");
  });

  it("uses default model and dimensions", () => {
    const provider = new VoyageEmbeddingProvider();
    expect(provider.dimensions).toBe(1024);
  });

  it("accepts custom options", () => {
    const provider = new VoyageEmbeddingProvider({
      model: "voyage-4",
      dimensions: 512,
      apiKey: "custom-key",
    });
    expect(provider.dimensions).toBe(512);
  });

  it("embed() calls API with input_type document", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    });

    const provider = new VoyageEmbeddingProvider({ dimensions: 3 });
    const result = await provider.embed("hello world");

    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(0.1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input_type).toBe("document");
    expect(body.model).toBe("voyage-4-large");
  });

  it("embedQuery() calls API with input_type query", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.4, 0.5, 0.6] }],
      }),
    });

    const provider = new VoyageEmbeddingProvider({ dimensions: 3 });
    const result = await provider.embedQuery("search term");

    expect(result).toBeInstanceOf(Float32Array);
    // Get the most recent call (not [0] which may be from a prior test)
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    expect(body.input_type).toBe("query");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid API key",
    });

    const provider = new VoyageEmbeddingProvider();
    await expect(provider.embed("test")).rejects.toThrow("Voyage API error (401)");
  });

  it("throws on malformed response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const provider = new VoyageEmbeddingProvider();
    await expect(provider.embed("test")).rejects.toThrow("unexpected response");
  });
});
