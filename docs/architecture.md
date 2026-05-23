# Architecture

Campaign Sandbox uses a hybrid workflow-agent architecture. The product is a deterministic workflow with bounded LLM stages, not a free-roaming multi-agent system.

Deterministic code owns orchestration, schema validation, scoring weights, trace logging, retries, persistence boundaries, artifact export, and safety rules. LLM stages are reserved for tasks where language judgment matters: brief normalization, strategic tension extraction, campaign route generation, synthetic audience simulation, pre-mortem critique, and final plan synthesis.

## Current stage status

| Stage | Status | Provider |
|---|---|---|
| `normalize_brief` | **Real (optional)** | `mock` (default) or `openai` |
| `extract_strategic_tension` | Mocked | — |
| `generate_routes` | Mocked | — |
| `build_personas` | Mocked | — |
| `simulate_reactions` | Mocked | — |
| `score_routes` | Deterministic | — |
| `premortem_review` | Mocked | — |
| `compare_routes` | Deterministic | — |
| `human_selection` | Human gate | — |
| `generate_execution_plan` | Mocked | — |
| `export_artifact` | Placeholder | — |

## Server boundary

Real LLM code runs exclusively server-side:

- `lib/env.ts` — reads provider config and API keys. Never imported in client components.
- `lib/llm/` — provider adapter and `generateJson()` helper. Server-side only.
- `lib/workflow/stages/` — individual bounded LLM stage functions. Server-side only.
- `app/api/campaign/*/route.ts` — API routes that call stage functions.

Client components call API routes, not stage functions directly. The mock workflow (`lib/workflow/run-campaign-workflow.ts`) remains client-safe and uses no server-only imports.

## Provider adapter

`lib/llm/generate-json.ts` implements a minimal OpenAI adapter using the native `fetch` API. No OpenAI SDK dependency is added. Each stage function:

1. Checks the active provider via `lib/env.ts`.
2. If mock: returns deterministic output immediately.
3. If openai: loads the prompt file, calls `generateJson()`, validates with Zod, retries once on parse or schema failure.
4. Emits a trace event with telemetry (provider, model, promptVersion, tokens, costUsd, durationMs).

## Prompt discipline

Each LLM stage has exactly one prompt file in `prompts/`. Prompts instruct the model to return JSON only, with no commentary or markdown. Schema expectations are explicit in each prompt. Prompt changes are versioned through normal code review.

## Schemas and validation

All stage outputs are validated with Zod schemas in `lib/schemas/campaign.ts`. Unvalidated model output is never returned to callers. Schema drift is caught immediately in tests.

## For v1, no database, auth, or persistence.

Later integrations should follow the same server boundary pattern: new stage function → new API route → validated schema → trace event → tests.
