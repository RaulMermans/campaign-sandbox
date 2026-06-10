# Observability

Every workflow stage emits trace events so users can inspect what happened, where a decision came from, and which stage produced each output.

## Trace event fields

All trace events include:

- `id` — unique event ID
- `runId` — campaign run ID
- `stageId` — which stage produced the event
- `type` — lifecycle event type (`workflow.started`, `stage.started`, `stage.completed`, `stage.failed`, etc.)
- `status` — current stage status (`pending`, `running`, `completed`, `failed`)
- `message` — human-readable description
- `timestamp` — ISO 8601 datetime
- `durationMs` — stage execution time (optional)
- `inputSchema` / `outputSchema` — named schema types for the stage

## LLM telemetry fields

When a stage uses a real LLM provider, these additional fields are included:

| Field | Description |
|---|---|
| `provider` | Provider name: `"mock"` or `"openai"` |
| `model` | Model ID used, e.g. `"gpt-4.1-mini"` or `"mock-normalizer"` |
| `promptVersion` | Prompt file and version, e.g. `"normalize_brief.v1"` |
| `inputTokens` | Tokens in the prompt (undefined if unavailable) |
| `outputTokens` | Tokens in the response (undefined if unavailable) |
| `costUsd` | Estimated cost (0 for mock; undefined if not provided by API) |

Mock providers always set `costUsd: 0`. Token counts are `undefined` in mock mode. Mock model names:
- `normalize_brief`: `"mock-normalizer"`
- `extract_strategic_tension`: `"mock-strategic-tension"`
- `generate_campaign_routes`: `"mock-route-generator"`
- `build_personas`: `"mock-persona-builder"`
- `simulate_reactions`: `"mock-reaction-simulator"`
- `premortem_review`: `"mock-premortem-reviewer"`
- `generate_execution_plan`: `"mock-execution-planner"`
- `creative_director_review`: `"mock-creative-director"`

## Run metadata panel

The UI includes a `RunMetadataPanel` component that derives the following display fields from trace events at render time:

- **Provider** — derived from `traceEvent.provider` values across all stages
- **Model** — derived from `traceEvent.model` (LLM stages only)
- **Total runtime** — sum of all `durationMs` values
- **LLM runtime** — sum of `durationMs` for non-deterministic stages
- **Stage count**, **route count**, **persona count**, **simulation count**
- **Recommended route** — from `comparison.recommendedRouteId`

No API keys or raw env vars are included in these fields.

## What is not logged

- API keys or auth credentials
- Raw provider response objects containing metadata
- Full brief text in production telemetry (briefs stay in stage input/output schemas only)
- Uploaded file contents (briefs are processed in-memory and not written to logs)
- Composed prompt text (skill content injected via `composePrompt()` is not logged in full in production)

## Current storage

V1 stores trace events in the run response only. No persistence. Later versions should persist trace events with campaign runs.

## Stage-by-stage status

| Stage | Telemetry |
|---|---|
| `normalize_brief` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `extract_strategic_tension` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `generate_campaign_routes` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise. On a quality-gate or proof-integrity repair retry, a second attempt trace event is emitted with `attempt: 2` in metadata. `qualityWarnings` count included in result metadata. |
| `creative_director_review` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise. `promptVersion: "creative_director_review.v1"`. On-demand only — not part of `/api/campaign/run`. |
| `build_personas` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `simulate_reactions` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `score_routes` | Always: `provider: "deterministic"`, `model: "score-routes-v1"`, `costUsd: 0`, `promptVersion: undefined` |
| `premortem_review` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise. On a proof-integrity repair retry, a second attempt trace event is emitted with `attempt: 2` in metadata. |
| `compare_routes` | Always: `provider: "deterministic"`, `model: "compare-routes-v1"`, `costUsd: 0`, `promptVersion: undefined` |
| `human_selection` | Local UI action — no trace event emitted by the server |
| `generate_execution_plan` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise. `promptVersion: "generate_execution_plan.v1"`. Only emitted after explicit human route selection. On a proof-integrity repair retry, a second attempt trace event is emitted with `attempt: 2` in metadata. |
| `buildDecisionSummary` | Render-time deterministic — no trace event. Derived from existing run data. |
| `deriveRiskTaxonomy` | Render-time deterministic — no trace event. Derived from scores + comparison + premortem. |
| `deriveRouteSimulationSummaries` | Render-time deterministic — no trace event. Derived from routes + personas + simulations. |
| `export_artifact` | No trace event. Deterministic render from `CampaignReport` model into Markdown, HTML, or PPTX — same render path and cost (none) for all three formats. The Proof Integrity Guardrail re-check at the export boundary also has no trace event; a blocking finding returns a `422` response instead of a report. |

The six LLM stages emit `provider`, `model`, `promptVersion`, `inputTokens`, `outputTokens`, and `durationMs` in their trace events.

The `score_routes` stage is deterministic and always emits `provider: "deterministic"` and `model: "score-routes-v1"`. Token fields are not applicable. `costUsd` is always 0. `metadata` includes `scoringMode`, `routeCount`, and `simulationCount`.

The `compare_routes` stage is deterministic and always emits `provider: "deterministic"` and `model: "compare-routes-v1"`. Token fields are not applicable. `costUsd` is always 0. `metadata` includes `comparisonMode`, `routeCount`, and `recommendedRouteId`.

## Verifying real-provider trace events

When running `pnpm test:real-chain` against a dev server with `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`, each stage response includes a `traceEvent` with:

- `provider: "openai"` for the six LLM stages
- `provider: "deterministic"` for `score_routes`
- `model`: the actual OpenAI model used (e.g. `"gpt-4.1-mini"`)
- `inputTokens` / `outputTokens`: actual usage from the API response
- `durationMs`: wall-clock time for the stage including the API call

In mock mode, `provider` is `"mock"`, `costUsd` is `0`, and token fields are `undefined`. Token counts and costs are never fabricated.

## Provider coverage by mode

| Mode | LLM stages | score_routes | compare_routes | Later stages |
|---|---|---|---|---|
| `CAMPAIGN_SANDBOX_LLM_PROVIDER=mock` (default) | Mock trace events | Deterministic | Deterministic | Mock (after human selection) |
| `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` | Real LLM telemetry | Deterministic | Deterministic | Real LLM (after human selection) |

The Vercel build phase does not require `OPENAI_API_KEY` — the key is only used at runtime when provider is `openai`.
