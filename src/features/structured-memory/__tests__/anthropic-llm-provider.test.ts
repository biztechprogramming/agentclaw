import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnthropicLLMProvider } from "../anthropic-llm-provider.ts";

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

// Access the mock through the module
async function getMockCreate() {
  const mod = (await import("@anthropic-ai/sdk")) as Record<string, unknown>;
  return mod.__mockCreate as ReturnType<typeof vi.fn>;
}

describe("AnthropicLLMProvider", () => {
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

  it("extracts entities from valid Claude response", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            entities: [
              { name: "Alice", type: "person", description: "A developer", confidence: 0.95 },
              { name: "ProjectX", type: "project", description: "Main project", confidence: 0.8 },
            ],
            relationships: [{ sourceName: "Alice", targetName: "ProjectX", type: "works_on" }],
          }),
        },
      ],
    });

    const provider = new AnthropicLLMProvider();
    const result = await provider.extractEntities("Alice works on ProjectX");

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].name).toBe("Alice");
    expect(result.entities[0].type).toBe("person");
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe("works_on");
  });

  it("handles Claude response wrapped in code blocks", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '```json\n{"entities": [{"name": "Bob", "type": "person", "confidence": 0.9}], "relationships": []}\n```',
        },
      ],
    });

    const provider = new AnthropicLLMProvider();
    const result = await provider.extractEntities("Bob is here");

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe("Bob");
  });

  it("returns empty result on API error", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockRejectedValueOnce(new Error("API down"));

    const provider = new AnthropicLLMProvider();
    const result = await provider.extractEntities("test text");

    expect(result.entities).toHaveLength(0);
    expect(result.relationships).toHaveLength(0);
    expect(result.sourceText).toBe("test text");
  });

  it("filters invalid entity types", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            entities: [
              { name: "Alice", type: "person", confidence: 0.9 },
              { name: "Foo", type: "invalid_type", confidence: 0.9 },
            ],
            relationships: [],
          }),
        },
      ],
    });

    const provider = new AnthropicLLMProvider();
    const result = await provider.extractEntities("Alice and Foo");

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe("Alice");
  });

  it("clamps confidence to 0-1 range", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            entities: [{ name: "Alice", type: "person", confidence: 5.0 }],
            relationships: [],
          }),
        },
      ],
    });

    const provider = new AnthropicLLMProvider();
    const result = await provider.extractEntities("Alice");

    expect(result.entities[0].confidence).toBe(1);
  });

  it("uses configurable model", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"entities": [], "relationships": []}' }],
    });

    const provider = new AnthropicLLMProvider({ model: "claude-haiku-3-20240307" });
    await provider.extractEntities("test");

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1];
    expect(lastCall[0].model).toBe("claude-haiku-3-20240307");
  });
});
