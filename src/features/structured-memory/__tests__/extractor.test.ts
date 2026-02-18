import { describe, it, expect } from "vitest";
import { EntityExtractor } from "../extractor.ts";
import { EntityType } from "../types.ts";

describe("EntityExtractor", () => {
  const extractor = new EntityExtractor();

  it("extracts person names (capitalized multi-word)", async () => {
    const result = await extractor.extract("I had a meeting with John Smith about the project.");
    const people = result.entities.filter((e) => e.type === EntityType.Person);
    expect(people.length).toBeGreaterThanOrEqual(1);
    expect(people[0].name).toBe("John Smith");
    expect(people[0].confidence).toBe(0.5);
  });

  it("extracts dates in YYYY-MM-DD format", async () => {
    const result = await extractor.extract("The deadline is 2025-03-15 for delivery.");
    const dates = result.entities.filter((e) => e.type === EntityType.Date);
    expect(dates).toHaveLength(1);
    expect(dates[0].name).toBe("2025-03-15");
  });

  it("extracts dates in long format", async () => {
    const result = await extractor.extract("Meeting scheduled for January 15, 2025.");
    const dates = result.entities.filter((e) => e.type === EntityType.Date);
    expect(dates).toHaveLength(1);
    expect(dates[0].name).toContain("January");
  });

  it("extracts project identifiers", async () => {
    const result = await extractor.extract("Working on PROJ-42 and AC-100 today.");
    const projects = result.entities.filter((e) => e.type === EntityType.Project);
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.name)).toContain("PROJ-42");
    expect(projects.map((p) => p.name)).toContain("AC-100");
  });

  it("deduplicates same entity in text", async () => {
    const result = await extractor.extract("John Smith met with John Smith again.");
    const people = result.entities.filter((e) => e.type === EntityType.Person);
    expect(people).toHaveLength(1);
  });

  it("returns empty for text with no entities", async () => {
    const result = await extractor.extract("nothing special here at all");
    expect(result.entities).toHaveLength(0);
  });

  it("includes source text in result", async () => {
    const text = "Hello world";
    const result = await extractor.extract(text);
    expect(result.sourceText).toBe(text);
  });

  it("includes offsets for extracted entities", async () => {
    const result = await extractor.extract("Call John Smith tomorrow.");
    const person = result.entities.find((e) => e.type === EntityType.Person);
    expect(person).toBeDefined();
    expect(person!.startOffset).toBeTypeOf("number");
    expect(person!.endOffset).toBeTypeOf("number");
  });
});
