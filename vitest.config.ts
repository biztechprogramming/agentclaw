import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isWindows = process.platform === "win32";
const localWorkers = Math.max(4, Math.min(16, os.cpus().length));
const ciWorkers = isWindows ? 2 : 3;

export default defineConfig({
  resolve: {
    // Keep this ordered: the base `openclaw/plugin-sdk` alias is a prefix match.
    alias: [
      {
        find: "openclaw/plugin-sdk/account-id",
        replacement: path.join(repoRoot, "src", "plugin-sdk", "account-id.ts"),
      },
      {
        find: "openclaw/plugin-sdk",
        replacement: path.join(repoRoot, "src", "plugin-sdk", "index.ts"),
      },
    ],
  },
  test: {
    testTimeout: 120_000,
    hookTimeout: isWindows ? 180_000 : 120_000,
    // Many suites rely on `vi.stubEnv(...)` and expect it to be scoped to the test.
    // This is especially important under `pool=vmForks` where env leaks cross-file.
    unstubEnvs: true,
    // Same rationale as unstubEnvs: avoid cross-test pollution under vmForks.
    unstubGlobals: true,
    pool: "forks",
    maxWorkers: isCI ? ciWorkers : localWorkers,
    include: [
      "upstream/src/**/*.test.ts",
      "extensions/**/*.test.ts",
      "test/**/*.test.ts",
      "ui/src/ui/views/usage-render-details.test.ts",
    ],
    setupFiles: ["test/setup.ts"],
    exclude: [
      "dist/**",
      "apps/macos/**",
      "apps/macos/.build/**",
      "**/node_modules/**",
      "**/vendor/**",
      "dist/OpenClaw.app/**",
      "**/*.live.test.ts",
      "**/*.e2e.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Keep coverage stable without an ever-growing exclude list:
      // only count files actually exercised by the test suite.
      all: false,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 55,
        statements: 70,
      },
      // Anchor to repo-root `src/` only. Without this, coverage globs can
      // unintentionally match nested `*/src/**` folders (extensions, apps, etc).
      include: ["./upstream/src/**/*.ts"],
      exclude: [
        // Never count workspace packages/apps toward core coverage thresholds.
        "extensions/**",
        "apps/**",
        "ui/**",
        "test/**",
        "upstream/src/**/*.test.ts",
        // Entrypoints and wiring (covered by CI smoke + manual/e2e flows).
        "upstream/src/entry.ts",
        "upstream/src/index.ts",
        "upstream/src/runtime.ts",
        "upstream/src/channel-web.ts",
        "upstream/src/extensionAPI.ts",
        "upstream/src/logging.ts",
        "upstream/src/cli/**",
        "upstream/src/commands/**",
        "upstream/src/daemon/**",
        "upstream/src/hooks/**",
        "upstream/src/macos/**",

        // Large integration surfaces; validated via e2e/manual/contract tests.
        "upstream/src/acp/**",
        "upstream/src/agents/**",
        "upstream/src/channels/**",
        "upstream/src/gateway/**",
        "upstream/src/line/**",
        "upstream/src/media-understanding/**",
        "upstream/src/node-host/**",
        "upstream/src/plugins/**",
        "upstream/src/providers/**",

        // Some agent integrations are intentionally validated via manual/e2e runs.
        "upstream/src/agents/model-scan.ts",
        "upstream/src/agents/pi-embedded-runner.ts",
        "upstream/src/agents/sandbox-paths.ts",
        "upstream/src/agents/sandbox.ts",
        "upstream/src/agents/skills-install.ts",
        "upstream/src/agents/pi-tool-definition-adapter.ts",
        "upstream/src/agents/tools/discord-actions*.ts",
        "upstream/src/agents/tools/slack-actions.ts",

        // Hard-to-unit-test modules; exercised indirectly by integration tests.
        "upstream/src/infra/state-migrations.ts",
        "upstream/src/infra/skills-remote.ts",
        "upstream/src/infra/update-check.ts",
        "upstream/src/infra/ports-inspect.ts",
        "upstream/src/infra/outbound/outbound-session.ts",
        "upstream/src/memory/batch-gemini.ts",

        // Gateway server integration surfaces are intentionally validated via manual/e2e runs.
        "upstream/src/gateway/control-ui.ts",
        "upstream/src/gateway/server-bridge.ts",
        "upstream/src/gateway/server-channels.ts",
        "upstream/src/gateway/server-methods/config.ts",
        "upstream/src/gateway/server-methods/send.ts",
        "upstream/src/gateway/server-methods/skills.ts",
        "upstream/src/gateway/server-methods/talk.ts",
        "upstream/src/gateway/server-methods/web.ts",
        "upstream/src/gateway/server-methods/wizard.ts",

        // Process bridges are hard to unit-test in isolation.
        "upstream/src/gateway/call.ts",
        "upstream/src/process/tau-rpc.ts",
        "upstream/src/process/exec.ts",
        // Interactive UIs/flows are intentionally validated via manual/e2e runs.
        "upstream/src/tui/**",
        "upstream/src/wizard/**",
        // Channel surfaces are largely integration-tested (or manually validated).
        "upstream/src/discord/**",
        "upstream/src/imessage/**",
        "upstream/src/signal/**",
        "upstream/src/slack/**",
        "upstream/src/browser/**",
        "upstream/src/channels/web/**",
        "upstream/src/telegram/index.ts",
        "upstream/src/telegram/proxy.ts",
        "upstream/src/telegram/webhook-set.ts",
        "upstream/src/telegram/**",
        "upstream/src/webchat/**",
        "upstream/src/gateway/server.ts",
        "upstream/src/gateway/client.ts",
        "upstream/src/gateway/protocol/**",
        "upstream/src/infra/tailscale.ts",
      ],
    },
  },
});
