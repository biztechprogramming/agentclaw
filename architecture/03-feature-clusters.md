# 03 — Feature Clusters

Features that share architectural patterns are grouped into clusters. Building one feature in a cluster dramatically lowers the cost of the others.

---

## Cluster A: "Know Me" — Memory & Context

**Features:** Structured Memory, Smart Context Management, Time Capsules, Conversation Replay

**Shared pattern:** All of these ingest content, index it semantically, and retrieve it contextually. They differ in *when* retrieval happens and *what* triggers it.

| Feature | Ingest | Index | Retrieve Trigger |
|---------|--------|-------|-----------------|
| Structured Memory | Conversations, files | Vector + Entity Graph | Agent query / auto-inject |
| Smart Context | Session history | Summarization + vector | Every agent turn |
| Time Capsules | Snapshot of current state | Sealed blob + metadata | Scheduled date |
| Conversation Replay | Session transcripts | Branching tree structure | User request to fork |

**Shared foundations:** Knowledge Store (F1), Entity Graph (F2)

**Build order:** Structured Memory first (it creates the storage and indexing layer everything else uses), then Smart Context (immediate productivity win), then Time Capsules and Replay (low marginal effort).

---

## Cluster B: "Watch Me" — Observation & Prediction

**Features:** Ambient Workspace Awareness, Predictive Action Chains, Apprentice Mode, Visual Changelog, Emotional Intelligence

**Shared pattern:** All of these consume the Observation Bus, detect patterns, and either store them or act on them. The difference is the *type* of pattern and the *response*.

| Feature | Observes | Detects | Response |
|---------|----------|---------|----------|
| Ambient Awareness | Screen, files, clipboard | Current activity context | Contextual suggestions |
| Predictive Chains | Action sequences over time | Recurring routines | Pre-assembled workflows |
| Apprentice Mode | Recorded task sessions | Step-by-step procedures | Reproducible automation |
| Visual Changelog | Periodic screenshots | — (pure capture) | Searchable visual history |
| Emotional Intelligence | Message tone, timing | Emotional state shifts | Adaptive behavior |

**Shared foundations:** Observation Bus (F3), Behavior Model (F4), Knowledge Store (F1)

**Build order:** Observation Bus first (the pipe everything flows through), then Ambient Awareness (immediate value, validates the bus), then Predictive Chains (highest long-term impact), then the rest.

---

## Cluster C: "Be Me" — Agency & Autonomy

**Features:** Digital Twin, Persona Engine, Self-Modifying Architecture, Personal API Gateway

**Shared pattern:** All of these involve the agent acting *as* the user or *on behalf of* the user with varying degrees of autonomy. They share the Behavior Model and Capability Gate.

| Feature | Autonomy Level | Identity | Guardrail |
|---------|---------------|----------|-----------|
| Persona Engine | Low — user switches modes | Configured personas | Capability sets per persona |
| Personal API Gateway | Medium — responds to external queries | Public-facing agent | Rate limits + scope restrictions |
| Digital Twin | High — acts as user | Learned user identity | Approval digest + boundaries |
| Self-Modifying | High — changes own config | Agent-as-architect | Sandbox + approval threshold |

**Shared foundations:** Behavior Model (F4), Capability Gate (F5), Simulation Engine (F6)

**Build order:** Persona Engine first (simplest, establishes the identity-switching pattern), then Personal API Gateway (external interface, tests the Capability Gate under adversarial conditions), then Digital Twin (requires mature Behavior Model), then Self-Modifying (requires mature Simulation Engine).

---

## Cluster D: "Help Me" — Productivity & Integration

**Features:** Task Engine, Inbox Triage, Proactive Intelligence, Life Dashboard, Agent Mesh

**Shared pattern:** All of these aggregate external data, apply intelligence, and surface actionable insights. They're integration-heavy and share the same data flow: ingest → classify → store → alert.

| Feature | Data Source | Intelligence | Output |
|---------|-----------|-------------|--------|
| Task Engine | Manual + extracted from conversations | Priority, dependency, blocking | Task state + notifications |
| Inbox Triage | Email providers | Classification, urgency, action extraction | Sorted inbox + drafts |
| Proactive Intelligence | All subsystems | Pattern matching, anomaly detection | Contextual alerts |
| Life Dashboard | All subsystems | Aggregation + trend detection | Persistent visual UI |
| Agent Mesh | Other OpenClaw instances | Trust negotiation, capability exchange | Cross-agent coordination |

**Shared foundations:** Knowledge Store (F1), Entity Graph (F2), Capability Gate (F5)

**Build order:** Task Engine first (self-contained, high value), then Inbox Triage (similar ingest/classify pattern), then Proactive Intelligence (consumes both), then Life Dashboard (visualization layer over everything), then Agent Mesh (requires stable external interface).

---

## Cluster Dependencies

```
Cluster A (Know Me)
    │
    ▼ provides context to
Cluster B (Watch Me)
    │
    ▼ feeds patterns into
Cluster C (Be Me)
    │
    ▼ acts on behalf via
Cluster D (Help Me)
```

Clusters can be built in parallel but the value compounds when A is built first — everything downstream gets better context.
