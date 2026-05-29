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

## What is not logged

- API keys or auth credentials
- Raw provider response objects containing metadata
- Full brief text in production telemetry (briefs stay in stage input/output schemas only)

## Current storage

V1 stores trace events in mock run objects only. Later versions should persist them with campaign runs.

## Stage-by-stage status

| Stage | Telemetry |
|---|---|
| `normalize_brief` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `extract_strategic_tension` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `generate_campaign_routes` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `build_personas` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `simulate_reactions` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `score_routes` | Always: `provider: "deterministic"`, `model: "score-routes-v1"`, `costUsd: 0`, `promptVersion: undefined` |
| `premortem_review` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| All other stages | Mock trace events only |

The six LLM stages emit `provider`, `model`, `promptVersion`, `inputTokens`, `outputTokens`, and `durationMs` in their trace events.

The `score_routes` stage is deterministic and always emits `provider: "deterministic"` and `model: "score-routes-v1"`. Token fields are not applicable (`inputTokens` and `outputTokens` are omitted). `costUsd` is always 0. `promptVersion` is not applicable. `metadata` includes `scoringMode`, `routeCount`, and `simulationCount`.

## Verifying real-provider trace events

When running `pnpm test:real-chain` against a dev server with `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`, each stage response includes a `traceEvent` with:

- `provider: "openai"` for the six LLM stages
- `provider: "deterministic"` for `score_routes`
- `model`: the actual OpenAI model used (e.g. `"gpt-4.1-mini"`)
- `inputTokens` / `outputTokens`: actual usage from the API response
- `durationMs`: wall-clock time for the stage including the API call

In mock mode, `provider` is `"mock"`, `costUsd` is `0`, and token fields are `undefined`. Token counts and costs are never fabricated.

## Provider coverage by mode

| Mode | LLM stages | score_routes | Later stages |
|---|---|---|---|
| `CAMPAIGN_SANDBOX_LLM_PROVIDER=mock` (default) | Mock trace events | Deterministic | Mock trace events |
| `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` | Real LLM telemetry | Deterministic | Mock trace events |

The Vercel build phase does not require `OPENAI_API_KEY` — the key is only used at runtime when provider is `openai`.
