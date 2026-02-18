# 01 — MediatR as Core Nervous System

## Why MediatR

OpenClaw today is a mix of direct function calls, event emitters, and hook chains. This works but creates invisible coupling: adding a new feature means touching existing code paths. MediatR gives us a single dispatch pattern for everything — commands, queries, notifications — with a pipeline that handles cross-cutting concerns uniformly.

## Core Concepts

### Commands (write operations)
A command represents an intent to change state. One handler per command. Returns a result or void.

Examples:
- `CreateTask` → task engine creates and indexes a task
- `TriageEmail` → inbox system classifies and routes an email
- `SpawnAgent` → session manager creates an isolated agent run
- `SealTimeCapsule` → packages context for future delivery
- `ForkConversation` → branches conversation history at a point

### Queries (read operations)
A query retrieves data without side effects. One handler per query.

Examples:
- `SearchMemory` → vector + FTS search across knowledge graph
- `GetLifeDashboard` → aggregates state from all subsystems
- `PredictNextActions` → returns predicted action chain for current context
- `SimulateActionChain` → dry-runs a sequence and returns projected outcomes

### Notifications (events, fan-out)
A notification is a domain event that multiple handlers can subscribe to. Zero or many handlers. This is the primary decoupling mechanism.

Examples:
- `MessageReceived` → memory indexes it, proactive layer evaluates it, twin learns from it
- `FileChanged` → ambient awareness updates, RAG re-indexes, dashboard refreshes
- `TaskCompleted` → predictive chains update, dashboard refreshes, notifications fire
- `RoutineDetected` → predictive engine stores pattern, suggests automation

### Pipeline Behaviors (middleware)
Behaviors wrap every request in the pipeline. They execute in order, forming an onion around every command/query.

**Standard pipeline (in order):**

1. **Logging** — structured trace of every request
2. **Validation** — schema + business rule validation before handler runs
3. **Authorization** — capability check against current context/channel/persona
4. **Audit** — write to immutable audit log (for capability-based security)
5. **Retry/Circuit Breaker** — transient failure handling for external calls
6. **Caching** — query-side cache check/population
7. **Transaction** — wrap command handlers in storage transactions
8. **Metrics** — timing, token usage, cost tracking

## How This Maps to OpenClaw

| Current OpenClaw Pattern | MediatR Replacement |
|--------------------------|-------------------|
| Direct tool handler calls | Commands dispatched through pipeline |
| Hook chains (`before_tool_call`, etc.) | Pipeline behaviors (ordered, composable) |
| Event emitters (channel events) | Notifications with registered handlers |
| Session context injection | Query pipeline with caching behavior |
| Cron job execution | Command dispatch with scheduling metadata |
| Plugin `before_agent_start` overrides | Pipeline behavior registered by plugin |

## Pipeline Extensibility

Plugins register custom behaviors at specific pipeline positions. A security plugin might add an extra authorization behavior. A compliance plugin might add a data-classification behavior before the transaction layer. This replaces the current hook system with something typed, ordered, and testable.

## Event Topology

```
Inbound Message
    │
    ▼
┌─────────────────────────┐
│   MediatR Pipeline      │
│  (behaviors wrap all)   │
│                         │
│  ┌───────────────────┐  │
│  │ Command/Query     │  │
│  │ Handler           │──┼──▶ Notifications (fan-out)
│  └───────────────────┘  │         │
└─────────────────────────┘         ├──▶ Memory Indexer
                                    ├──▶ Proactive Engine
                                    ├──▶ Predictive Chains
                                    ├──▶ Dashboard Update
                                    ├──▶ Twin Learning
                                    └──▶ Audit Log
```

Every feature in this architecture plugs into this topology as either a command/query handler or a notification subscriber. Features never call each other directly — they emit events and the mediator routes them.
