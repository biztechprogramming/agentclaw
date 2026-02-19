/**
 * Anthropic summarization provider — uses Claude for conversation summarization.
 * @module features/smart-context/anthropic-summarization-provider
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ISummarizationProvider } from "./types.ts";

/** Configuration options for AnthropicSummarizationProvider */
export interface AnthropicSummarizationOptions {
  /** Model name (default: "claude-sonnet-4-20250514") */
  model?: string;
  /** API key override (default: reads ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Max tokens for response (default: 1024) */
  maxTokens?: number;
}

const SUMMARIZATION_PROMPT = `Summarize the following conversation turns into a concise summary. Return ONLY valid JSON with this exact structure:

{
  "summary": "A concise summary of the conversation capturing key decisions, topics, and outcomes.",
  "keyTopics": ["topic1", "topic2", "topic3"]
}

Rules:
- Summary should be 2-4 sentences, capturing the most important information
- keyTopics should be 3-7 short phrases identifying the main subjects discussed
- Focus on decisions, actions, and information exchanged — not pleasantries
- Return valid JSON only, no markdown wrapping`;

/**
 * AnthropicSummarizationProvider uses Claude to summarize conversation turns
 * into compact representations with key topics.
 */
export class AnthropicSummarizationProvider implements ISummarizationProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicSummarizationOptions = {}) {
    this.model = options.model ?? "claude-sonnet-4-20250514";
    this.maxTokens = options.maxTokens ?? 1024;
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  /** Summarize conversation turns */
  async summarize(
    turns: Array<{ role: string; content: string }>,
  ): Promise<{ summary: string; keyTopics: string[] }> {
    try {
      const formattedTurns = turns.map((t) => `${t.role}: ${t.content}`).join("\n");

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: "user",
            content: `${SUMMARIZATION_PROMPT}\n\nConversation:\n${formattedTurns}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        return this.fallback(turns);
      }

      return this.parseResponse(content.text, turns);
    } catch {
      return this.fallback(turns);
    }
  }

  /** Parse and validate the JSON response from Claude */
  private parseResponse(
    responseText: string,
    turns: Array<{ role: string; content: string }>,
  ): { summary: string; keyTopics: string[] } {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.fallback(turns);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      keyTopics?: string[];
    };

    if (typeof parsed.summary !== "string" || !parsed.summary) {
      return this.fallback(turns);
    }

    const keyTopics = Array.isArray(parsed.keyTopics)
      ? parsed.keyTopics.filter((t): t is string => typeof t === "string")
      : [];

    return { summary: parsed.summary, keyTopics };
  }

  /** Fallback: simple truncation when Claude fails */
  private fallback(turns: Array<{ role: string; content: string }>): {
    summary: string;
    keyTopics: string[];
  } {
    const combined = turns.map((t) => `${t.role}: ${t.content}`).join("\n");
    const summary = combined.length > 500 ? combined.slice(0, 500) + "..." : combined;
    const keyTopics = turns
      .map((t) => t.content.split(/\s+/).slice(0, 3).join(" "))
      .filter((t) => t.length > 2)
      .slice(0, 5);
    return { summary, keyTopics };
  }
}
