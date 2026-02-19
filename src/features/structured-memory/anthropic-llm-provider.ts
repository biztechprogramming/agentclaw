/**
 * Anthropic LLM provider for entity extraction.
 * @module features/structured-memory/anthropic-llm-provider
 */

import Anthropic from "@anthropic-ai/sdk";
import { EntityType } from "./types.ts";
import type { ExtractionResult, ILLMProvider } from "./types.ts";

/** Configuration options for AnthropicLLMProvider */
export interface AnthropicLLMProviderOptions {
  /** Model name (default: "claude-sonnet-4-20250514") */
  model?: string;
  /** API key override (default: reads ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Max tokens for response (default: 2048) */
  maxTokens?: number;
}

const VALID_ENTITY_TYPES = new Set(Object.values(EntityType));

const EXTRACTION_PROMPT = `Extract entities and relationships from the following text. Return ONLY valid JSON with this exact structure:

{
  "entities": [
    {
      "name": "entity name",
      "type": "person|project|decision|task|date|place|organization|topic",
      "description": "brief description",
      "confidence": 0.9
    }
  ],
  "relationships": [
    {
      "sourceName": "entity A",
      "targetName": "entity B",
      "type": "relationship type (e.g. works_on, located_in, depends_on, mentioned_with)"
    }
  ]
}

Rules:
- Entity types must be one of: person, project, decision, task, date, place, organization, topic
- Confidence is 0-1 (1 = very certain)
- Only include clearly identifiable entities, not common words
- Relationships should connect entities you extracted
- Return empty arrays if no entities found`;

/**
 * AnthropicLLMProvider uses Claude to extract entities from text.
 * Falls back to empty results on parse errors.
 */
export class AnthropicLLMProvider implements ILLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicLLMProviderOptions = {}) {
    this.model = options.model ?? "claude-sonnet-4-20250514";
    this.maxTokens = options.maxTokens ?? 2048;
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  /** Extract entities from text using Claude */
  async extractEntities(text: string): Promise<ExtractionResult> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nText to analyze:\n${text}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        return { entities: [], sourceText: text, relationships: [] };
      }

      return this.parseResponse(content.text, text);
    } catch {
      // On any API or parse error, return empty result
      return { entities: [], sourceText: text, relationships: [] };
    }
  }

  /** Parse and validate the JSON response from Claude */
  private parseResponse(responseText: string, sourceText: string): ExtractionResult {
    // Extract JSON from response (Claude sometimes wraps in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { entities: [], sourceText, relationships: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      entities?: Array<{
        name?: string;
        type?: string;
        description?: string;
        confidence?: number;
      }>;
      relationships?: Array<{
        sourceName?: string;
        targetName?: string;
        type?: string;
      }>;
    };

    // Validate and filter entities
    const entities = (parsed.entities ?? [])
      .filter(
        (e): e is { name: string; type: string; description?: string; confidence: number } =>
          typeof e.name === "string" &&
          typeof e.type === "string" &&
          VALID_ENTITY_TYPES.has(e.type as EntityType),
      )
      .map((e) => ({
        name: e.name,
        type: e.type as EntityType,
        description: e.description,
        confidence: typeof e.confidence === "number" ? Math.min(1, Math.max(0, e.confidence)) : 0.7,
      }));

    // Validate relationships
    const entityNames = new Set(entities.map((e) => e.name));
    const relationships = (parsed.relationships ?? []).filter(
      (r): r is { sourceName: string; targetName: string; type: string } =>
        typeof r.sourceName === "string" &&
        typeof r.targetName === "string" &&
        typeof r.type === "string" &&
        entityNames.has(r.sourceName) &&
        entityNames.has(r.targetName),
    );

    return { entities, sourceText, relationships };
  }
}
