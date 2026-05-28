# Architecture

Campaign Sandbox uses a hybrid workflow-agent architecture. The product is a deterministic workflow with bounded LLM stages, not a free-roaming multi-agent system.

Deterministic code owns orchestration, schema validation, scoring weights, trace logging, retries, persistence boundaries, artifact export, and safety rules. LLM stages are reserved for tasks where language judgment matters: brief normalization, strategic tension extraction, campaign route generation, synthetic audience simulation, pre-mortem critique, and final plan synthesis.

## Current stage status

| Stage | Status | Provider |
|---|---|---|
| `normalize_brief` | **Real (optional)** | `mock` (default) or `openai` |
| `extract_strategic_tension` | **Real (optional)** | `mock` (default) or `openai` |
| `generate_campaign_routes` | **Real (optional)** | `mock` (default) or `openai` |
| `build_personas` | **Real (optional)** | `mock` (default) or `openai` |
| `simulate_reactions` | **Real (optional)** | `mock` (default) or `openai` |
| `score_routes` | **Deterministic** | `deterministic` (no LLM) |
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
- `app/api/campaign/normalize/route.ts` — normalization API endpoint.
- `app/api/campaign/tension/route.ts` — strategic tension API endpoint. Consumes validated normalized briefs only.
- `app/api/campaign/routes/route.ts` — route generation API endpoint. Consumes validated normalized brief and strategic tension only.
- `app/api/campaign/personas/route.ts` — persona building API endpoint. Consumes validated normalized brief, strategic tension, and routes only.
- `app/api/campaign/simulations/route.ts` — simulation API endpoint. Consumes validated normalized brief, strategic tension, routes, and personas only.
- `app/api/campaign/scores/route.ts` — scoring API endpoint. Deterministic. Consumes validated routes, personas, and simulations. Does not call an LLM. Works without `OPENAI_API_KEY`.

Client components call API routes, not stage functions directly. The mock workflow (`lib/workflow/run-campaign-workflow.ts`) remains client-safe and uses no server-only imports.

## API error safety

All API routes catch typed errors and return sanitized responses. Raw provider output, model text, stack traces, and API keys are never returned to clients. LLM error responses use the shape `{ error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" | "LLM_JSON_PARSE_ERROR" | "LLM_SCHEMA_VALIDATION_ERROR" }`. Deterministic workflow errors use `{ error: "Route scoring validation failed.", code: "WORKFLOW_VALIDATION_ERROR", issues: [...] }`. Validation errors include path and message details for developer use but no raw model content or stack traces.

## `extract_strategic_tension` stage notes

- Server-side only. Never exposed to the browser.
- Consumes a validated `NormalizedCampaignBrief` object — it does not accept raw messy brief text.
- Does not use real market data or audience research.
- Does not produce predictions or probability claims.
- Output is strategic interpretation based only on the normalized brief.
- Validates output with `strategicTensionSchema` before returning.
- Retries once on JSON parse or schema validation failure.

## `generate_campaign_routes` stage notes

- Server-side only. Never exposed to the browser.
- Consumes a validated `NormalizedCampaignBrief` and `StrategicTension` — does not accept raw brief text.
- Generates 3–5 strategically distinct campaign routes (safest, boldest, conversion-oriented).
- Does not use real market data, real audience research, or historical performance data.
- Does not produce probability claims or success predictions.
- Routes are strategic options for human decision-making, not recommendations.
- Output is validated with `campaignRoutesOutputSchema` (Zod wrapper) before returning.
- `campaignRoutesOutputSchema` enforces required strategic roles (`safest`, `boldest`, `conversion`) and unique route IDs via `.superRefine()`.
- Retries once on JSON parse or schema validation failure.
- Prompt version: `generate_campaign_routes.v1`.

## `build_personas` stage notes

- Server-side only. Never exposed to the browser.
- Consumes validated `NormalizedCampaignBrief`, `StrategicTension`, and `CampaignRoute[]` — does not accept raw brief text.
- Generates 3–6 synthetic personas grounded in the campaign inputs.
- Personas are synthetic audience hypotheses for planning purposes, not real research.
- They do not predict real behavior and must not be presented as real data.
- Personas must not be used for discriminatory targeting. Protected characteristics are not targeting criteria.
- Output is validated with `personasOutputSchema` (Zod wrapper) before returning.
- `personasOutputSchema` enforces unique persona IDs via `.superRefine()`.
- Retries once on JSON parse or schema validation failure.
- Prompt version: `build_personas.v1`.

## `simulate_reactions` stage notes

- Server-side only. Never exposed to the browser.
- Consumes validated `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoute[]`, and `Persona[]` — does not accept raw brief text.
- Generates exactly one simulation for every route/persona pair (full matrix coverage is required).
- Simulations are synthetic planning devices. They are not real audience research, do not predict real behavior, and must never be presented as market validation, survey findings, or statistical evidence.
- Scores (`resonanceScore`, `conversionIntent`, `signupIntent`) are bounded qualitative strategy scores (1–5), not probabilities.
- `confidence` reflects certainty in the synthetic interpretation, not real-world outcome certainty.
- Every simulation `caveat` must clearly label the reaction as synthetic.
- Output is validated with `personaSimulationsOutputSchema` (Zod wrapper) before returning. Cross-reference coverage is validated with `validateSimulationCoverage` (in `lib/workflow/validate-simulations.ts`) after Zod validation.
- `personaSimulationsOutputSchema` enforces unique route/persona pairs and the synthetic caveat via `.superRefine()`.
- `validateSimulationCoverage` enforces that every route ID and persona ID matches an input item, and that no pair is missing or duplicated.
- Retries once on JSON parse, schema validation, or coverage failure.
- Prompt version: `simulate_reactions.v1`.

## `score_routes` stage notes

- Server-side only. Never exposed to the browser.
- **Deterministic.** Does not call an LLM. Does not read `CAMPAIGN_SANDBOX_LLM_PROVIDER`. Works without `OPENAI_API_KEY`.
- Consumes validated `CampaignRoute[]`, `Persona[]`, and `PersonaSimulation[]` — does not require the full brief or strategic tension.
- Scores use simulation data (average resonance score, average conversion intent, objection count) combined with role-default weights per strategic role (`safest`, `boldest`, `conversion`).
- All individual scores and `weightedTotal` are bounded to [1, 5] and rounded to one decimal place.
- Scores are bounded qualitative strategic estimates, not probabilities or predictions. They support human route comparison; they do not replace judgment.
- Validates simulation coverage with `validateSimulationCoverage` before scoring.
- Validates output against `routeScoresOutputSchema` (Zod wrapper) after scoring.
- Validates score coverage with `validateRouteScoreCoverage` (in `lib/workflow/validate-route-scores.ts`) after schema validation.
- Throws `WorkflowValidationError` (not `LlmSchemaValidationError`) on coverage failures.
- Trace event: `provider: "deterministic"`, `model: "score-routes-v1"`, `costUsd: 0`, `promptVersion: undefined`.
- API: `POST /api/campaign/scores` — accepts `{ routes, personas, simulations }` (bare arrays or wrappers).

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

## Next stage

The next stage to implement is `premortem_review`. It can use an LLM and should consume route scores and simulations to identify failure modes, weak assumptions, and mitigations per route — and then overall. Human selection remains required before final plan generation.
