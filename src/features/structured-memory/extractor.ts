/**
 * EntityExtractor — extracts entities from text using LLM or regex fallback.
 * @module features/structured-memory/extractor
 */

import { EntityType } from "./types.ts";
import type { ExtractedEntity, ExtractionResult, ILLMProvider } from "./types.ts";

/** Regex patterns for stub extraction */
const PATTERNS: Array<{ type: EntityType; pattern: RegExp }> = [
  // Capitalized multi-word names (likely people/orgs)
  { type: EntityType.Person, pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g },
  // Dates
  { type: EntityType.Date, pattern: /\b(\d{4}-\d{2}-\d{2})\b/g },
  {
    type: EntityType.Date,
    pattern:
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/g,
  },
  // Email-style project refs: PROJECT-123
  { type: EntityType.Project, pattern: /\b([A-Z]{2,}-\d+)\b/g },
  // URLs as topics
  { type: EntityType.Topic, pattern: /\b(https?:\/\/[^\s]+)\b/g },
];

/**
 * Stub regex-based extraction fallback.
 * Extracts basic entities without requiring an LLM.
 */
function regexExtract(text: string): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const { type, pattern } of PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const key = `${type}:${name.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      entities.push({
        name,
        type,
        confidence: 0.5,
        startOffset: match.index,
        endOffset: match.index + match[0].length,
      });
    }
  }

  return { entities, sourceText: text, relationships: [] };
}

/**
 * EntityExtractor uses a pluggable LLM provider to extract entities,
 * falling back to regex-based extraction when no provider is available.
 */
export class EntityExtractor {
  private llm: ILLMProvider | undefined;

  constructor(llm?: ILLMProvider) {
    this.llm = llm;
  }

  /** Extract entities from text */
  async extract(text: string): Promise<ExtractionResult> {
    if (this.llm) {
      try {
        return await this.llm.extractEntities(text);
      } catch {
        // Fall back to regex on LLM failure
      }
    }
    return regexExtract(text);
  }
}
