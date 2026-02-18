# 06 — Integration Map

## Feature Interaction via MediatR Events

No feature imports another. All interaction is through notifications. This map shows which features produce events that other features consume.

```
                    ┌──────────────────────────────────────────────┐
                    │            MediatR Event Bus                 │
                    └──────┬───────────────────────────────────────┘
                           │
  ┌────────────────────────┼────────────────────────────────────────┐
  │                        │                                        │
  │   PRODUCERS            │   CONSUMERS                            │
  │                        │                                        │
  │   Structured Memory ───┤── ContentIndexed ──────▶ Proactive     │
  │                        │                  ──────▶ Smart Context  │
  │                        │                  ──────▶ Twin Learning  │
  │                        │                                        │
  │   Memory ──────────────┤── EntityDiscovered ────▶ Task Engine   │
  │                        │                  ──────▶ Life Dashboard │
  │                        │                  ──────▶ Entity Graph   │
  │                        │                                        │
  │   Inbox Triage ────────┤── EmailClassified ─────▶ Proactive     │
  │                        │── UrgentEmailDetected ─▶ Life Dashboard│
  │                        │── EmailReceived ───────▶ Memory        │
  │                        │                  ──────▶ Task Engine   │
  │                        │                                        │
  │   Task Engine ─────────┤── TaskOverdue ─────────▶ Proactive     │
  │                        │── TaskCompleted ───────▶ Predictive    │
  │                        │                  ──────▶ Life Dashboard │
  │                        │                                        │
  │   Observation Bus ─────┤── ScreenChanged ───────▶ Ambient       │
  │                        │── FileChanged ─────────▶ Memory        │
  │                        │                  ──────▶ Visual Log    │
  │                        │── (all events) ────────▶ Predictive    │
  │                        │                  ──────▶ Emotional     │
  │                        │                                        │
  │   Predictive Chains ───┤── PredictionReady ─────▶ Proactive     │
  │                        │── RoutineDetected ─────▶ Twin          │
  │                        │                  ──────▶ Apprentice    │
  │                        │                                        │
  │   Emotional Intel ─────┤── MoodShiftDetected ──▶ Proactive     │
  │                        │                  ──────▶ Life Dashboard │
  │                        │                  ──────▶ Persona Engine│
  │                        │                                        │
  │   Proactive Intel ─────┤── AlertFired ──────────▶ Life Dashboard│
  │                        │               ─────────▶ Twin (if act) │
  │                        │               ─────────▶ Channel Send  │
  │                        │                                        │
  │   Agent Mesh ──────────┤── PeerQueryReceived ──▶ Capability Gate│
  │                        │── PeerDiscovered ─────▶ Life Dashboard │
  │                        │                                        │
  │   Persona Engine ──────┤── PersonaSwitched ────▶ Capability Gate│
  │                        │                 ──────▶ Smart Context  │
  │                        │                                        │
  └────────────────────────┴────────────────────────────────────────┘
```

## Cross-Cutting Pipeline Behaviors (applied to ALL requests)

```
Every Command/Query
    │
    ├─ 1. LoggingBehavior
    ├─ 2. ValidationBehavior
    ├─ 3. CapabilityGateBehavior ◄── Persona-aware, context-aware
    ├─ 4. AuditBehavior ◄── Writes to audit_log
    ├─ 5. ContentClassificationBehavior ◄── Routes sensitive data to vault
    ├─ 6. SimulationBehavior ◄── Active only during dry-runs (redirects writes)
    ├─ 7. CachingBehavior ◄── Query-side only
    ├─ 8. RetryBehavior ◄── External calls only
    └─ 9. MetricsBehavior ◄── Timing, tokens, cost
```

## Build Sequence (recommended)

### Phase 1: Foundation (weeks 1–4)
Build the substrate everything else depends on.

1. **MediatR pipeline** — replace hook system, wire existing tools as commands
2. **Knowledge Store (F1)** — SQLite + sqlite-vec + FTS5
3. **Capability Gate (F5)** — pipeline behavior, basic policy model

### Phase 2: Know Me (weeks 5–8)
First user-visible features. Immediate productivity gains.

4. **Structured Memory** — entity extraction, vector indexing, semantic search
5. **Smart Context Management** — RAG retrieval per turn, session summarization

### Phase 3: Help Me (weeks 9–12)
External integrations that make the assistant genuinely useful daily.

6. **Task Engine** — CRUD + external sync + auto-extraction from conversations
7. **Inbox Triage** — email fetch, classify, draft, surface action items
8. **Proactive Intelligence** — cross-domain alerting (leverages everything above)

### Phase 4: Watch Me (weeks 13–16)
Observation infrastructure and pattern detection.

9. **Observation Bus (F3)** — event sources, typed notifications
10. **Behavior Model (F4)** — routine detection, style profiling
11. **Predictive Action Chains** — learned routines, pre-assembled workflows
12. **Ambient Awareness** — contextual suggestions from current activity

### Phase 5: Be Me (weeks 17–20)
Higher autonomy features. Requires mature foundations.

13. **Persona Engine** — identity switching, per-persona capabilities
14. **Simulation Engine (F6)** — sandboxed dry-runs
15. **Digital Twin** — autonomous action with approval digest
16. **Personal API Gateway** — external query interface

### Phase 6: Polish (weeks 21+)
Features with lower urgency or high marginal cost.

17. **Life Dashboard** — canvas-based visualization
18. **Time Capsules** — context snapshot + scheduled delivery
19. **Conversation Replay** — branch and fork
20. **Agent Mesh** — peer discovery and trust negotiation
21. **Apprentice Mode** — learn-by-watching
22. **Visual Changelog** — screenshot history
23. **Self-Modifying Architecture** — A/B testing own config
24. **Confidential Computing** — vault mode + content routing
25. **Emotional Intelligence** — adaptive tone and behavior

## Existing OpenClaw Infrastructure Reuse

| Existing System | Reused By |
|----------------|-----------|
| Cron scheduler | Time Capsules, Inbox polling, Observation scheduling, Predictive triggers |
| Node pairing | Agent Mesh (trust model), Observation Bus (sensor sources) |
| Canvas | Life Dashboard, Simulation visualization |
| Session model | Persona partitions, Conversation branching |
| Tool pipeline | MediatR command handlers (1:1 migration path) |
| Hook system | Replaced by pipeline behaviors (backward-compat shim) |
| Channel routing | Digital Twin intercept, Persona-based routing |
| Plugin SDK | Hot-reload plugins register behaviors + handlers via MediatR |
| Voice/TTS | Emotional Intelligence adaptive output |
| Browser tool | Ambient Awareness (tab context), Apprentice Mode (web task recording) |
