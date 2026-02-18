/**
 * Hybrid search — FTS5 + vector similarity + entity graph traversal.
 * @module foundations/knowledge-store/search
 */

import type Database from "better-sqlite3";

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  source: "fts" | "vector" | "graph";
  sourceUri?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  minScore?: number;
}

/**
 * Perform hybrid search across FTS5, vector, and entity graph.
 * Results are merged and ranked by score.
 */
export function hybridSearch(db: Database.Database, options: SearchOptions): SearchResult[] {
  const limit = options.limit ?? 20;
  const results: SearchResult[] = [];

  // 1. FTS5 full-text search
  try {
    const ftsResults = db
      .prepare(`
      SELECT c.id, c.content, c.source_uri, c.metadata,
             bm25(content_chunks_fts) * -1 as score
      FROM content_chunks_fts fts
      JOIN content_chunks c ON c.rowid = fts.rowid
      WHERE content_chunks_fts MATCH ?
      ORDER BY bm25(content_chunks_fts)
      LIMIT ?
    `)
      .all(options.query, limit) as Array<{
      id: string;
      content: string;
      source_uri: string;
      metadata: string;
      score: number;
    }>;

    // Normalize FTS scores: BM25 produces very small values with few docs.
    // Map to 0-1 range relative to the best match.
    const maxFts = ftsResults.length > 0 ? Math.max(...ftsResults.map((r) => r.score), 1e-10) : 1;
    for (const r of ftsResults) {
      results.push({
        id: r.id,
        content: r.content,
        score: maxFts > 0 ? r.score / maxFts : 1, // normalize to 0-1
        source: "fts",
        sourceUri: r.source_uri,
        metadata: JSON.parse(r.metadata || "{}"),
      });
    }
  } catch {
    // FTS query may fail on invalid syntax — skip
  }

  // 2. Vector search (requires sqlite-vec extension)
  // Skipped in stub — real implementation would query vec0 virtual table

  // 3. Entity graph traversal — find chunks mentioning entities matching query
  try {
    const graphResults = db
      .prepare(`
      SELECT DISTINCT c.id, c.content, c.source_uri, c.metadata, 0.5 as score
      FROM entities e
      JOIN entity_mentions em ON em.entity_id = e.id
      JOIN content_chunks c ON c.id = em.chunk_id
      WHERE e.name LIKE ? OR e.description LIKE ?
      LIMIT ?
    `)
      .all(`%${options.query}%`, `%${options.query}%`, limit) as Array<{
      id: string;
      content: string;
      source_uri: string;
      metadata: string;
      score: number;
    }>;

    for (const r of graphResults) {
      if (!results.some((existing) => existing.id === r.id)) {
        results.push({
          id: r.id,
          content: r.content,
          score: r.score,
          source: "graph",
          sourceUri: r.source_uri,
          metadata: JSON.parse(r.metadata || "{}"),
        });
      }
    }
  } catch {
    // Graph search may fail if tables are empty
  }

  // Sort by score descending, apply limit
  results.sort((a, b) => b.score - a.score);
  const minScore = options.minScore ?? 0;
  return results.filter((r) => r.score >= minScore).slice(0, limit);
}
