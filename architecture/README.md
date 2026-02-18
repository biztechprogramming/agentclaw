# AgentClaw Architecture

Carried forward from the design phase. See each document for details.

| Doc | Scope |
|-----|-------|
| [01-mediatr-core.md](01-mediatr-core.md) | MediatR pipeline — commands, queries, events, behaviors |
| [02-shared-foundations.md](02-shared-foundations.md) | 6 shared subsystems all features depend on |
| [03-feature-clusters.md](03-feature-clusters.md) | Feature groupings with shared patterns and build order |
| [04-feature-specs.md](04-feature-specs.md) | Per-feature MediatR primitives and dependencies |
| [05-data-architecture.md](05-data-architecture.md) | Storage, schemas, retention, encryption |
| [06-integration-map.md](06-integration-map.md) | Event wiring, pipeline stack, build sequence, upstream reuse |
| [07-upstream-separation.md](07-upstream-separation.md) | How OpenClaw-derived code is isolated from new work |
