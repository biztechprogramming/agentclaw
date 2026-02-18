# 02 — Shared Foundations

These are subsystems that multiple features depend on. Each is a standalone concern with a clear interface. Features consume them — they never consume each other.

---

## F1: Knowledge Store

**Used by:** Memory/Knowledge Graph, RAG Context, Proactive Intelligence, Predictive Chains, Digital Twin, Life Dashboard, Time Capsules, Visual Changelog

A unified local storage layer combining:
- **SQLite** — relational data (tasks, entities, relationships, audit log, event history)
- **Vector index** (sqlite-vec or LanceDB) — semantic search over embeddings
- **FTS5** — full-text search fallback and keyword boosting
- **Blob store** — screenshots, attachments, capsule payloads (file-system backed, content-addressed)

Single write path. All writes go through MediatR commands so pipeline behaviors (encryption, indexing, auditing) apply uniformly.

---

## F2: Entity Graph

**Used by:** Memory, Proactive Intelligence, Digital Twin, Agent Mesh, Life Dashboard, Inbox Triage

An entity-relationship layer on top of the Knowledge Store. Auto-extracted from conversations, files, emails, and calendar events.

Entity types: Person, Project, Task, Decision, Meeting, Document, Codebase, Place, Event.

Relationships are typed and timestamped: `Person —works_on→ Project`, `Decision —made_during→ Meeting`, `Task —blocked_by→ Task`.

Extraction happens as a notification handler on `ContentIndexed` events — it runs asynchronously and doesn't block the main pipeline.

---

## F3: Observation Bus

**Used by:** Ambient Awareness, Predictive Chains, Proactive Intelligence, Apprentice Mode, Visual Changelog, Emotional Intelligence

A continuous stream of contextual observations about what the user is doing. Sources:
- Active window / app (accessibility APIs or periodic polling)
- File system watchers
- Clipboard changes
- Git activity
- Calendar state changes
- Inbound messages (all channels)
- Screen captures (opt-in, configurable interval)
- Node sensor data (location, camera, motion)

Observations are lightweight typed events published as MediatR notifications. Subscribers decide what to index, what to act on, and what to discard. The bus itself retains nothing — subscribers own their storage.

---

## F4: Behavior Model

**Used by:** Predictive Chains, Digital Twin, Persona Engine, Emotional Intelligence, Apprentice Mode

A learned model of the user's patterns, preferences, and routines. Built from Observation Bus data over time.

Stores:
- **Routine sequences** — ordered action patterns with time-of-day/day-of-week correlation
- **Communication style** — per-channel, per-recipient tone/length/formality profiles
- **Decision patterns** — how the user typically responds to categories of decisions
- **Emotional baselines** — normal typing speed, response latency, message length by time of day

This is not a fine-tuned LLM — it's structured data that gets injected into prompts as context when relevant features need it. The LLM interprets the patterns; the Behavior Model just captures them.

---

## F5: Capability Gate

**Used by:** All features (via pipeline behavior)

The authorization layer for capability-based security. Every MediatR request passes through it.

Model:
- **Capabilities** are granular permissions: `exec.shell`, `exec.shell.sudo`, `file.read`, `file.write.workspace`, `email.send`, `email.read`, `calendar.read`, `message.send.external`
- **Contexts** scope capabilities: channel, persona, time-of-day, sensitivity classification
- **Policies** map contexts to capability sets: "In Discord groups, deny `file.write` outside workspace"
- **Approval flows** — when a command requires a capability the current context doesn't have, the gate can prompt for approval instead of hard-denying

All decisions are logged to the audit trail in the Knowledge Store.

---

## F6: Simulation Engine

**Used by:** Simulation Sandbox, Predictive Chains, Conversation Replay, Self-Modifying Architecture

A sandboxed execution environment for dry-running action chains. Takes a proposed sequence of commands, executes them against a snapshot of current state (forked DB, mock external APIs), and returns projected outcomes.

Uses the same MediatR pipeline but with a `SimulationBehavior` injected at the top that redirects all writes to a temporary fork and stubs external calls with predicted responses.

---

## Foundation Dependency Map

```
┌─────────────────────────────────────────┐
│            Capability Gate (F5)          │  ← wraps everything
├─────────────────────────────────────────┤
│          Simulation Engine (F6)         │  ← optional fork layer
├──────────┬──────────┬───────────────────┤
│ Knowledge│  Entity  │   Observation     │
│ Store(F1)│ Graph(F2)│   Bus (F3)        │
│          │  ↑ uses  │                   │
│          │   F1     │                   │
├──────────┴──────────┴───────────────────┤
│           Behavior Model (F4)           │
│            ↑ consumes F3, stores in F1  │
└─────────────────────────────────────────┘
```
