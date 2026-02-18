# 07 — Upstream Separation Strategy

How OpenClaw-derived code is isolated from AgentClaw-original code.

## Directory Boundary

```
agentclaw/
├── upstream/                ← ALL OpenClaw-derived code lives here
│   ├── UPSTREAM-LICENSE      ← Original OpenClaw MIT license, untouched
│   ├── UPSTREAM-VERSION.md   ← Records which OpenClaw commit/version this was forked from
│   ├── gateway/              ← Gateway server, WS control plane, config
│   ├── channels/             ← All channel adapters (telegram, discord, slack, etc.)
│   ├── agents/               ← Agent runtime, session model, tool pipeline
│   ├── cli/                  ← CLI commands (gateway, agent, send, doctor, wizard)
│   ├── nodes/                ← Node pairing, camera, screen, location
│   ├── providers/            ← Model provider adapters (anthropic, openai, ollama, etc.)
│   ├── media/                ← Media pipeline (images, audio, video, transcription)
│   ├── tts/                  ← Text-to-speech
│   ├── browser/              ← Browser automation
│   ├── canvas/               ← Canvas host + A2UI
│   ├── cron/                 ← Cron scheduler
│   ├── plugins/              ← Plugin SDK + loader
│   ├── security/             ← Existing security (exec guards, DM policy, pairing)
│   ├── web/                  ← WebChat + Control UI
│   └── shared/               ← Utilities, types, logging
│
├── src/                     ← ALL AgentClaw-original code lives here
│   ├── mediatr/
│   ├── foundations/
│   ├── features/
│   └── integration/
```

**Rule: no file exists in both directories.** If you modify an upstream file, it stays in `upstream/`. If you write new code, it goes in `src/`. This makes it trivially auditable which code is derived vs. original.

## Integration Layer

`src/integration/` is the bridge. It contains adapters that connect upstream systems to the new MediatR pipeline.

### Adapter Pattern

Each upstream system gets a thin adapter that:
1. Subscribes to upstream events (hooks, emitters) 
2. Translates them into MediatR notifications
3. Exposes upstream capabilities as MediatR command/query handlers

```
upstream/channels/telegram  ──▶  src/integration/channel-adapter.ts  ──▶  MessageReceived notification
upstream/agents/tool-runner ──▶  src/integration/tool-adapter.ts     ──▶  ToolExecuted notification  
upstream/cron/scheduler     ──▶  src/integration/cron-adapter.ts     ──▶  CronScheduleFired notification
```

The adapters are intentionally thin — they translate, they don't contain logic. This means:
- Upstream can be updated independently (pull from OpenClaw, re-apply rebranding patches)
- New features never import from `upstream/` directly — only through `src/integration/`
- If you ever want to replace an upstream component (e.g., swap the gateway), only the adapter changes

## Rebranding Scope

Modifications to upstream code are limited to:
- **Package name** — `openclaw` → `agentclaw` in package.json, imports, CLI binary name
- **User-facing strings** — product name in UI, CLI output, error messages, docs
- **Entry points** — binary name, service name, config paths

Internal variable names, function names, and module structure stay as-is to minimize diff from upstream and make future merges possible.

## Upstream Sync Strategy

To pull improvements from OpenClaw:

1. Maintain a git remote pointing to the OpenClaw repo
2. Periodically diff upstream changes against `upstream/` directory
3. Cherry-pick relevant fixes/features
4. Re-apply the rebranding patch set (kept as a small, reproducible script)

This is optional — you can also diverge fully. But keeping the option open costs almost nothing with this separation.

## What Gets Modified vs. What Stays Clean

| Upstream Component | Modification Level | Reason |
|-------------------|-------------------|--------|
| Gateway server | Light (config paths, service name) | Core plumbing, works as-is |
| Channel adapters | None (used via integration layer) | No changes needed |
| Agent runtime | Medium (hook into MediatR pipeline) | Tool calls route through new pipeline |
| CLI | Light (binary name, branding) | Cosmetic only |
| Session model | Medium (persona partitions, branching) | Extended by new features |
| Tool pipeline | Medium (becomes MediatR command dispatch) | Biggest integration point |
| Plugin SDK | Light (namespace) | Plugins register MediatR behaviors |
| Config schema | Extended (new sections for AgentClaw features) | Additive, not breaking |

## Build System

Single `package.json` at root. Both `upstream/` and `src/` compile together. The TypeScript project references keep compilation boundaries clean:

```
tsconfig.json              ← root, references both
├── upstream/tsconfig.json  ← compiles upstream code
└── src/tsconfig.json       ← compiles AgentClaw code, can import from upstream types only via integration
```
