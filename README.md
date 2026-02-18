# 🦀 AgentClaw

**A personal AI agent that knows you, predicts what you need, and acts on your behalf.**

AgentClaw is an intelligent personal agent platform built on a MediatR-driven event architecture. It connects to your channels, learns your patterns, manages your tasks and inbox, and progressively becomes your digital twin.

Forked from [OpenClaw](https://github.com/openclaw/openclaw) — the multi-channel personal AI assistant.

## What Makes AgentClaw Different

- **Knowledge Graph** — structured memory with entity extraction and relationship tracking
- **Predictive Intelligence** — learns your routines and pre-assembles workflows before you ask
- **Inbox Triage** — AI-powered email classification, action extraction, and draft responses
- **Proactive Alerts** — cross-domain pattern detection that surfaces what matters
- **Digital Twin** — acts as you when you're away, with approval digests
- **Persona Engine** — context-aware identity switching with scoped capabilities
- **Agent Mesh** — your agent talks to other agents, peer-to-peer
- **MediatR Pipeline** — every operation flows through typed commands, queries, and events with uniform security, auditing, and extensibility

## Architecture

See [architecture/](architecture/) for the full design.

## Project Structure

```
agentclaw/
├── upstream/           ← OpenClaw-derived code (gateway, channels, CLI, nodes)
│   └── src/            ← Original OpenClaw source (git mv'd for traceability)
├── src/                ← AgentClaw-original code (new architecture)
│   ├── mediatr/        ← Core pipeline: commands, queries, notifications, behaviors
│   ├── foundations/     ← Shared subsystems (knowledge store, entity graph, etc.)
│   ├── features/       ← Feature modules (one per feature)
│   └── integration/    ← Glue between upstream and new architecture
├── architecture/       ← Design documents
├── LICENSE             ← MIT (with OpenClaw attribution)
└── README.md
```

## Lineage

AgentClaw is forked from [OpenClaw](https://github.com/openclaw/openclaw) (MIT).
The `upstream/` directory contains the original OpenClaw code for gateway, channel, and tool infrastructure.
Everything in `src/` is original AgentClaw work.

## License

MIT — see [LICENSE](LICENSE).
