# 04 — Per-Feature Architecture Summaries

Each feature is described by: what it does, what MediatR primitives it uses, which foundations it depends on, and what it emits. No feature directly imports another feature.

---

## Structured Memory + Knowledge Graph
- **Cluster:** A (Know Me)
- **Commands:** `IndexContent`, `ExtractEntities`, `LinkEntities`, `ForgetEntity`
- **Queries:** `SearchMemory`, `GetEntityContext`, `GetRelationshipPath`
- **Subscribes to:** `MessageReceived`, `FileChanged`, `TaskCompleted`, `EmailReceived`
- **Emits:** `ContentIndexed`, `EntityDiscovered`, `RelationshipCreated`
- **Foundations:** F1 (Knowledge Store), F2 (Entity Graph)

---

## Smart Context Window Management
- **Cluster:** A (Know Me)
- **Commands:** `SummarizeTurns`, `CompactSession`
- **Queries:** `RetrieveRelevantContext`, `GetSessionSummary`
- **Subscribes to:** `AgentTurnCompleted`
- **Emits:** `ContextWindowUpdated`
- **Foundations:** F1 (Knowledge Store)
- **Note:** Replaces current brute-force context stuffing. Each agent turn triggers a query that retrieves only relevant past context via vector similarity + recency weighting.

---

## Time Capsule Mode
- **Cluster:** A (Know Me)
- **Commands:** `SealTimeCapsule`, `OpenTimeCapsule`
- **Queries:** `ListPendingCapsules`, `PreviewCapsule`
- **Subscribes to:** `CronScheduleFired` (for delivery)
- **Emits:** `CapsuleDelivered`
- **Foundations:** F1 (Knowledge Store — blob store for sealed payloads)
- **Note:** Sealing snapshots current memory context, relevant files, and conversation state into an immutable blob. Opening restores that context into the active session.

---

## Conversation Replay + Branch
- **Cluster:** A (Know Me)
- **Commands:** `ForkConversation`, `ReplayBranch`
- **Queries:** `GetConversationTree`, `GetBranchDiff`
- **Subscribes to:** — (user-initiated only)
- **Emits:** `ConversationForked`
- **Foundations:** F1 (Knowledge Store), F6 (Simulation Engine — for "what if" replays)

---

## Ambient Workspace Awareness
- **Cluster:** B (Watch Me)
- **Commands:** `RegisterObservationSource`, `SetAwarenessLevel`
- **Queries:** `GetCurrentContext`, `GetActivitySummary`
- **Subscribes to:** `ScreenChanged`, `FileChanged`, `ClipboardChanged`, `AppSwitched`
- **Emits:** `ContextualSuggestion`, `ActivityClassified`
- **Foundations:** F3 (Observation Bus), F1 (Knowledge Store)

---

## Predictive Action Chains
- **Cluster:** B (Watch Me)
- **Commands:** `RecordActionSequence`, `ConfirmPrediction`, `RejectPrediction`
- **Queries:** `PredictNextActions`, `GetRoutines`
- **Subscribes to:** all Observation Bus events (pattern detection runs continuously)
- **Emits:** `RoutineDetected`, `PredictionReady`
- **Foundations:** F3 (Observation Bus), F4 (Behavior Model), F6 (Simulation Engine — for pre-assembly validation)

---

## Apprentice Mode
- **Cluster:** B (Watch Me)
- **Commands:** `StartRecording`, `StopRecording`, `SaveProcedure`
- **Queries:** `GetProcedureSteps`, `CanReproduceProcedure`
- **Subscribes to:** Observation Bus events during recording
- **Emits:** `ProcedureLearned`, `ProcedureExecuted`
- **Foundations:** F3 (Observation Bus), F4 (Behavior Model)
- **Note:** Recording sessions are bounded. The agent segments observations into discrete steps, infers intent for each, and asks clarifying questions. Saved procedures become executable skills.

---

## Visual Changelog / Life Log
- **Cluster:** B (Watch Me)
- **Commands:** `CaptureSnapshot`, `SetRetentionPolicy`
- **Queries:** `SearchVisualHistory`, `GetTimelineSlice`
- **Subscribes to:** `CronScheduleFired` (periodic capture), `ScreenChanged` (change-triggered)
- **Emits:** `SnapshotCaptured`
- **Foundations:** F3 (Observation Bus), F1 (Knowledge Store — blob store for images)

---

## Emotional Intelligence
- **Cluster:** B (Watch Me)
- **Commands:** `UpdateEmotionalBaseline`
- **Queries:** `GetCurrentMood`, `GetEmotionalTrend`
- **Subscribes to:** `MessageReceived`, `TypingPatternObserved`
- **Emits:** `MoodShiftDetected`, `BreakSuggested`
- **Foundations:** F3 (Observation Bus), F4 (Behavior Model)

---

## Digital Twin Mode
- **Cluster:** C (Be Me)
- **Commands:** `EnableTwinMode`, `ApproveTwinAction`, `ReviewTwinDigest`
- **Queries:** `GetTwinDecisionLog`, `GetPendingApprovals`
- **Subscribes to:** `MessageReceived` (when twin mode active, intercepts before normal handling)
- **Emits:** `TwinActed`, `TwinEscalated`
- **Foundations:** F4 (Behavior Model), F5 (Capability Gate), F6 (Simulation Engine)

---

## Persona Engine
- **Cluster:** C (Be Me)
- **Commands:** `SwitchPersona`, `CreatePersona`, `SetPersonaSchedule`
- **Queries:** `GetActivePersona`, `GetPersonaCapabilities`
- **Subscribes to:** `CronScheduleFired` (auto-switch), `ChannelContextChanged`
- **Emits:** `PersonaSwitched`
- **Foundations:** F4 (Behavior Model), F5 (Capability Gate)
- **Note:** Personas define: model, thinking level, tool access, memory partition, tone profile, and channel routing. Current SOUL.md becomes the "default" persona.

---

## Self-Modifying Architecture
- **Cluster:** C (Be Me)
- **Commands:** `ProposeConfigChange`, `ApproveChange`, `RollbackChange`
- **Queries:** `GetPendingProposals`, `GetChangeHistory`, `GetABTestResults`
- **Subscribes to:** `AgentTurnCompleted` (measures effectiveness), `UserCorrected`
- **Emits:** `ChangeProposed`, `ChangeApplied`, `ChangeRolledBack`
- **Foundations:** F5 (Capability Gate), F6 (Simulation Engine)

---

## Personal API Gateway
- **Cluster:** C (Be Me)
- **Commands:** `RegisterEndpoint`, `SetRateLimit`, `RevokeAccess`
- **Queries:** `HandleExternalQuery` (dispatches to appropriate internal query)
- **Subscribes to:** — (externally triggered via HTTP)
- **Emits:** `ExternalQueryHandled`
- **Foundations:** F5 (Capability Gate)

---

## Task Engine
- **Cluster:** D (Help Me)
- **Commands:** `CreateTask`, `UpdateTask`, `CompleteTask`, `SyncExternalTasks`
- **Queries:** `GetTaskBoard`, `GetBlockers`, `GetDueToday`
- **Subscribes to:** `EntityDiscovered` (auto-extract tasks from conversations), `EmailReceived` (action items)
- **Emits:** `TaskCreated`, `TaskCompleted`, `TaskOverdue`
- **Foundations:** F1 (Knowledge Store), F2 (Entity Graph)

---

## Inbox Triage
- **Cluster:** D (Help Me)
- **Commands:** `FetchEmails`, `ClassifyEmail`, `DraftResponse`, `ArchiveEmail`
- **Queries:** `GetInboxSummary`, `GetUrgentItems`, `GetActionItems`
- **Subscribes to:** `CronScheduleFired` (periodic fetch), `EmailReceived`
- **Emits:** `EmailReceived`, `EmailClassified`, `UrgentEmailDetected`
- **Foundations:** F1 (Knowledge Store), F2 (Entity Graph)

---

## Proactive Intelligence
- **Cluster:** D (Help Me)
- **Commands:** `RegisterAlert`, `DismissAlert`, `SnoozeAlert`
- **Queries:** `GetActiveAlerts`, `GetInsights`
- **Subscribes to:** practically everything — `TaskOverdue`, `EmailClassified`, `MoodShiftDetected`, `RoutineDetected`, `CalendarEventApproaching`, etc.
- **Emits:** `AlertFired`, `InsightGenerated`
- **Foundations:** F1 (Knowledge Store), F2 (Entity Graph)
- **Note:** This is the "glue brain." It subscribes to events from all other features and applies cross-domain reasoning. Its value scales with the number of active features.

---

## Life Dashboard
- **Cluster:** D (Help Me)
- **Commands:** `RefreshDashboard`, `ConfigureDashboardWidgets`
- **Queries:** `GetDashboardState`, `GetTrendData`
- **Subscribes to:** `AlertFired`, `TaskCompleted`, `EmailClassified`, `MoodShiftDetected`, `ContextWindowUpdated`
- **Emits:** `DashboardUpdated`
- **Foundations:** F1 (Knowledge Store)
- **Note:** Renders via existing Canvas infrastructure. Each widget is a query aggregation.

---

## Agent Mesh Network
- **Cluster:** D (Help Me)
- **Commands:** `DiscoverPeers`, `NegotiateTrust`, `SendPeerQuery`, `RespondToPeer`
- **Queries:** `GetPeerCapabilities`, `GetTrustLevel`
- **Subscribes to:** `ExternalQueryHandled` (inbound from mesh), `PeerDiscovered`
- **Emits:** `PeerDiscovered`, `PeerQueryReceived`, `PeerResponseSent`
- **Foundations:** F5 (Capability Gate)
- **Note:** Builds on top of existing node pairing infrastructure. Trust levels: anonymous → verified → trusted → bonded. Each level unlocks more query types.

---

## Simulation Sandbox
- **Cluster:** (cross-cutting, used by C and B features)
- **Commands:** `SimulateActionChain`, `CompareSimulations`
- **Queries:** `GetSimulationResult`, `GetProjectedState`
- **Subscribes to:** — (invoked by other features)
- **Emits:** `SimulationCompleted`
- **Foundations:** F6 (Simulation Engine)

---

## Confidential Computing Mode
- **Cluster:** (cross-cutting)
- **Commands:** `EnableVaultMode`, `DisableVaultMode`, `ClassifyContent`
- **Queries:** `GetCurrentSecurityMode`, `GetContentClassification`
- **Subscribes to:** all commands (as a pipeline behavior that reroutes sensitive operations to local models)
- **Emits:** `SecurityModeChanged`, `ContentClassified`
- **Foundations:** F5 (Capability Gate), F1 (Knowledge Store — encrypted partition)
