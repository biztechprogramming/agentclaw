# Fork Guide — GitHub Fork Approach

## Step 1: Fork on GitHub

1. Go to https://github.com/openclaw/openclaw
2. Click **Fork** → create as `yourusername/agentclaw`
3. Clone locally:

```bash
git clone git@github.com:yourusername/agentclaw.git ~/agentclaw
cd ~/agentclaw
```

4. Add upstream remote for future syncing:

```bash
git remote add upstream https://github.com/openclaw/openclaw.git
git remote -v
# origin    → your fork
# upstream  → openclaw/openclaw
```

## Step 2: Create the restructure branch

```bash
git checkout -b restructure/agentclaw
```

## Step 3: Reorganize directories

Move all existing OpenClaw source into `upstream/` to establish the boundary:

```bash
# Move the existing src/ contents into upstream/
mkdir -p upstream
git mv src/ upstream/src

# Keep root config files in place (package.json, tsconfig, etc.)
# They'll be modified, not moved

# Create the new AgentClaw source tree
mkdir -p src/{mediatr/{commands,queries,notifications,behaviors},foundations/{knowledge-store,entity-graph,observation-bus,behavior-model,capability-gate,simulation-engine},features/{structured-memory,smart-context,time-capsules,conversation-replay,ambient-awareness,predictive-chains,apprentice-mode,visual-changelog,emotional-intelligence,digital-twin,persona-engine,self-modifying,personal-api,task-engine,inbox-triage,proactive-intelligence,life-dashboard,agent-mesh,simulation-sandbox,confidential-computing},integration}
```

## Step 4: Apply rebranding (user-facing only)

```bash
cd ~/agentclaw

# Package name and binary
sed -i 's/"name": "openclaw"/"name": "agentclaw"/' package.json

# Config paths in source
find upstream/src -type f -name '*.ts' | xargs sed -i 's/\.openclaw/\.agentclaw/g'

# Product name in user-facing strings
find upstream/src -type f -name '*.ts' | xargs sed -i 's/OpenClaw/AgentClaw/g'

# CLI binary name
find upstream/src -type f -name '*.ts' | xargs sed -i 's/openclaw/agentclaw/g'
```

**Review the diff carefully.** Revert changes to:
- URLs pointing to upstream OpenClaw (docs, GitHub, Discord)
- License/attribution text
- Comments referencing upstream behavior

## Step 5: Update LICENSE

Replace the LICENSE file with the dual-attribution version (already in this repo).
Keep the original OpenClaw LICENSE in `upstream/UPSTREAM-LICENSE`.

## Step 6: Commit and push

```bash
git add -A
git commit -m "restructure: establish AgentClaw fork with upstream separation"
git push origin restructure/agentclaw
git checkout main
git merge restructure/agentclaw
git push origin main
```

## Ongoing: Syncing from upstream

When OpenClaw ships fixes or features you want:

```bash
git fetch upstream
git log upstream/main --oneline -20   # see what's new

# Cherry-pick specific commits
git cherry-pick <commit-sha>

# Or merge a range (may need conflict resolution in restructured dirs)
git merge upstream/main
```

Because you used `git mv` (not copy), git tracks the rename and merges are usually clean.

## Ongoing: Contributing back

If you fix a bug in `upstream/src/` that would benefit OpenClaw:

1. Create a branch from your fork
2. Isolate the fix to the original file paths
3. Open a PR against `openclaw/openclaw`

This is the open source way. Everybody wins.
