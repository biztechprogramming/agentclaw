import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnthropicSummarizationProvider } from "../anthropic-summarization-provider.ts";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
    __mockCreate: mockCreate,
  };
});

async function getMockCreate() {
  const mod = (await import("@anthropic-ai/sdk")) as Record<string, unknown>;
  return mod.__mockCreate as ReturnType<typeof vi.fn>;
}

describe("AnthropicSummarizationProvider", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    vi.restoreAllMocks();
  });

  const sampleTurns = [
    { role: "user", content: "What's the status of the API migration?" },
    {
      role: "assistant",
      content:
        "The API migration is 80% complete. Auth endpoints are done, billing is in progress.",
    },
    { role: "user", content: "When will billing be ready?" },
    { role: "assistant", content: "Billing should be ready by Friday." },
  ];

  it("summarizes turns using Claude", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary:
              "Discussed API migration progress. Auth endpoints complete, billing in progress with Friday ETA.",
            keyTopics: ["API migration", "auth endpoints", "billing", "timeline"],
          }),
        },
      ],
    });

    const provider = new AnthropicSummarizationProvider();
    const result = await provider.summarize(sampleTurns);

    expect(result.summary).toContain("API migration");
    expect(result.keyTopics).toContain("billing");
  });

  it("falls back to truncation on API error", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockRejectedValueOnce(new Error("API down"));

    const provider = new AnthropicSummarizationProvider();
    const result = await provider.summarize(sampleTurns);

    expect(result.summary).toBeTruthy();
    expect(result.keyTopics.length).toBeGreaterThan(0);
  });

  it("falls back on malformed JSON response", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "This is not JSON at all" }],
    });

    const provider = new AnthropicSummarizationProvider();
    const result = await provider.summarize(sampleTurns);

    // Should fall back to truncation
    expect(result.summary).toBeTruthy();
  });

  it("uses configurable model", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"summary": "test", "keyTopics": ["a"]}',
        },
      ],
    });

    const provider = new AnthropicSummarizationProvider({ model: "claude-haiku-3-20240307" });
    await provider.summarize(sampleTurns);

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1];
    expect(lastCall[0].model).toBe("claude-haiku-3-20240307");
  });

  it("filters non-string keyTopics", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "A valid summary",
            keyTopics: ["valid", 123, null, "also valid"],
          }),
        },
      ],
    });

    const provider = new AnthropicSummarizationProvider();
    const result = await provider.summarize(sampleTurns);

    expect(result.keyTopics).toEqual(["valid", "also valid"]);
  });
});
