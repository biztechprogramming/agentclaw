/**
 * KnowledgeStore — SQLite-backed knowledge persistence layer.
 * @module foundations/knowledge-store/store
 */

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import type { IEmbeddingProvider } from "./embeddings.ts";
import { StubEmbeddingProvider } from "./embeddings.ts";
import { MIGRATIONS } from "./schema.ts";

export interface KnowledgeStoreOptions {
  dbPath?: string;
  embeddingProvider?: IEmbeddingProvider;
}

export class KnowledgeStore {
  readonly db: Database.Database;
  readonly embeddings: IEmbeddingProvider;

  constructor(options: KnowledgeStoreOptions = {}) {
    const dbPath = options.dbPath ?? ":memory:";
    this.db = new Database(dbPath);
    this.embeddings = options.embeddingProvider ?? new StubEmbeddingProvider();

    // WAL mode for concurrent reads
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    // Try loading sqlite-vec extension (graceful fallback)
    this.tryLoadVec();
    this.runMigrations();
  }

  private tryLoadVec(): void {
    try {
      // sqlite-vec provides loadable extension
      const sqliteVec = require("sqlite-vec");
      sqliteVec.load(this.db);
    } catch {
      // sqlite-vec not available — vector search will be skipped
    }
  }

  private runMigrations(): void {
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const applied = this.db.prepare("SELECT id FROM _migrations").all() as { id: number }[];
    const appliedSet = new Set(applied.map((r) => r.id));

    for (let i = 0; i < MIGRATIONS.length; i++) {
      if (!appliedSet.has(i)) {
        this.db.exec(MIGRATIONS[i]);
        this.db
          .prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, datetime('now'))")
          .run(i);
      }
    }
  }

  /** Compute SHA-256 hash of content */
  static contentHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  // --- Content Chunks ---

  insertChunk(params: {
    id: string;
    sourceUri: string;
    chunkIndex?: number;
    content: string;
    embedding?: Buffer;
    tokenCount?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const hash = KnowledgeStore.contentHash(params.content);
    this.db
      .prepare(`
      INSERT OR REPLACE INTO content_chunks (id, source_uri, chunk_index, content, content_hash, embedding, token_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        params.id,
        params.sourceUri,
        params.chunkIndex ?? 0,
        params.content,
        hash,
        params.embedding ?? null,
        params.tokenCount ?? null,
        JSON.stringify(params.metadata ?? {}),
      );
  }

  getChunk(id: string): Record<string, unknown> | undefined {
    return this.db.prepare("SELECT * FROM content_chunks WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
  }

  // --- Entities ---

  insertEntity(params: {
    id: string;
    name: string;
    type: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.db
      .prepare(`
      INSERT OR REPLACE INTO entities (id, name, type, description, metadata)
      VALUES (?, ?, ?, ?, ?)
    `)
      .run(
        params.id,
        params.name,
        params.type,
        params.description ?? null,
        JSON.stringify(params.metadata ?? {}),
      );
  }

  getEntity(id: string): Record<string, unknown> | undefined {
    return this.db.prepare("SELECT * FROM entities WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
  }

  // --- Relationships ---

  insertRelationship(params: {
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
    weight?: number;
    metadata?: Record<string, unknown>;
  }): void {
    this.db
      .prepare(`
      INSERT OR REPLACE INTO relationships (id, source_id, target_id, type, weight, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .run(
        params.id,
        params.sourceId,
        params.targetId,
        params.type,
        params.weight ?? 1.0,
        JSON.stringify(params.metadata ?? {}),
      );
  }

  // --- Audit Log ---

  logAudit(params: {
    id: string;
    action: string;
    actor?: string;
    target?: string;
    details?: Record<string, unknown>;
  }): void {
    this.db
      .prepare(`
      INSERT INTO audit_log (id, action, actor, target, details) VALUES (?, ?, ?, ?, ?)
    `)
      .run(
        params.id,
        params.action,
        params.actor ?? null,
        params.target ?? null,
        JSON.stringify(params.details ?? {}),
      );
  }

  // --- Capability Policies ---

  getPolicies(capability: string): Array<Record<string, unknown>> {
    return this.db
      .prepare("SELECT * FROM capability_policies WHERE capability = ?")
      .all(capability) as Array<Record<string, unknown>>;
  }

  insertPolicy(params: {
    id: string;
    capability: string;
    effect: "allow" | "deny" | "approval_required";
    channel?: string;
    persona?: string;
    userId?: string;
    conditions?: Record<string, unknown>;
  }): void {
    this.db
      .prepare(`
      INSERT OR REPLACE INTO capability_policies (id, capability, channel, persona, user_id, effect, conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        params.id,
        params.capability,
        params.channel ?? null,
        params.persona ?? null,
        params.userId ?? null,
        params.effect,
        JSON.stringify(params.conditions ?? {}),
      );
  }

  /** Close the database connection */
  close(): void {
    this.db.close();
  }
}
