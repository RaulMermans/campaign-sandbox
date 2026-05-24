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

## What is not logged

- API keys or auth credentials
- Raw provider response objects containing metadata
- Full brief text in production telemetry (briefs stay in stage input/output schemas only)
- Raw model output — never returned to callers or the UI

## Current storage

V1 stores trace events in mock run objects only. Later versions should persist them with campaign runs.

## Stage-by-stage status

| Stage | Telemetry |
|---|---|
| `normalize_brief` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `extract_strategic_tension` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| `generate_campaign_routes` | Real LLM telemetry when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`; mock otherwise |
| All other stages | Mock trace events only |

All three real stages emit `provider`, `model`, `promptVersion`, `inputTokens`, `outputTokens`, and `durationMs` in their trace events.
