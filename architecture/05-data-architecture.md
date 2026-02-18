# 05 — Data Architecture

## Storage Topology

Everything lives in a single SQLite database per agent (matching current OpenClaw's per-agent workspace model) with extensions for vector search. A separate encrypted partition exists for vault mode.

```
~/.openclaw/data/
├── agent-default/
│   ├── knowledge.db          ← SQLite + sqlite-vec + FTS5
│   ├── knowledge-vault.db    ← Encrypted at rest (vault mode)
│   ├── blobs/                ← Content-addressed file store
│   │   ├── screenshots/
│   │   ├── capsules/
│   │   └── attachments/
│   └── behavior/
│       ├── routines.json     ← Learned action sequences
│       ├── style-profiles.json
│       └── baselines.json
├── agent-work/               ← Per-persona partitions (if configured)
│   └── ...
└── mesh/
    ├── peers.db              ← Peer trust store
    └── keys/                 ← Cryptographic identity
```

## Schema Domains

### Entities & Relationships (Entity Graph — F2)
- `entities` — id, type, name, metadata (JSON), embedding, created, updated
- `relationships` — source_id, target_id, type, weight, context, timestamp
- `entity_mentions` — entity_id, source_type (message/file/email), source_id, timestamp

### Memory & Content (Knowledge Store — F1)
- `content_chunks` — id, source, text, embedding, summary, timestamp
- `session_summaries` — session_key, summary, key_decisions, timestamp
- `time_capsules` — id, sealed_at, deliver_at, context_blob_hash, opened

### Tasks
- `tasks` — id, title, status, priority, due, parent_id, source_type, source_id
- `task_dependencies` — task_id, depends_on_id, type (blocks/relates)
- `task_sync` — task_id, external_system, external_id, last_sync

### Observations & Patterns (Behavior Model — F4)
- `observations` — id, type, data (JSON), timestamp (high-write, auto-pruned)
- `routines` — id, name, steps (JSON), confidence, last_seen, times_seen
- `predictions` — id, routine_id, predicted_at, accepted, rejected

### Inbox
- `emails` — id, provider, external_id, from, subject, classification, urgency, action_items (JSON), timestamp
- `email_drafts` — email_id, draft_text, approved

### Audit & Security (Capability Gate — F5)
- `audit_log` — id, timestamp, command, actor, capability_used, context, result
- `capability_policies` — id, context_pattern, capabilities (JSON), persona_id

### Mesh
- `peers` — id, public_key, display_name, trust_level, capabilities (JSON), last_seen

## Data Flow Patterns

### Ingest → Index → Retrieve (Cluster A)
```
Source → ContentIndexed notification → Entity extraction handler → EntityDiscovered notification → Relationship linker
                                    → Vector embedding handler → Stored in content_chunks
                                    → FTS indexer → Stored in FTS5 index
```

### Observe → Detect → Act (Cluster B)
```
Observation Bus event → Pattern detector (sliding window over observations table)
                     → If pattern matches known routine → PredictionReady notification
                     → If new pattern with high confidence → RoutineDetected notification
```

### Query → Gate → Respond (Cluster C/D)
```
External/Internal query → Capability Gate behavior → Authorized? 
    → Yes: dispatch to handler → audit log → response
    → No, approval possible: ApprovalRequired notification → user approves → retry
    → No, hard deny: audit log → rejection response
```

## Retention & Pruning

- **Observations:** 7-day rolling window by default. Patterns extracted before pruning.
- **Screenshots:** Configurable retention (default 30 days). Thumbnails kept longer.
- **Session transcripts:** Summarized after 24h, originals pruned after configured period.
- **Audit log:** Never auto-pruned (append-only).
- **Entity graph:** Never auto-pruned (but relationships decay in weight over time without reinforcement).
- **Emails:** Follow user's retention preference. Classified metadata kept indefinitely.

## Encryption

- **Standard mode:** SQLite WAL mode, no encryption. Fast.
- **Vault mode:** SQLite with SQLCipher. Key derived from device keychain / hardware-backed store. Vector search still works but with performance penalty.
- **Content classification:** A pipeline behavior auto-classifies content sensitivity. High-sensitivity content auto-routes to vault partition even in standard mode.
