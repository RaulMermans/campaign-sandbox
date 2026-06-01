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
| `premortem_review` | **Real (optional)** | `mock` (default) or `openai` |
| `compare_routes` | **Deterministic** | `deterministic` (no LLM) |
| `human_selection` | Human gate | — |
| `generate_execution_plan` | Mocked / not implemented | — |
| `export_artifact` | Mocked / not implemented | — |

## Server boundary

Real LLM code runs exclusively server-side:

- `lib/env.ts` — reads provider config and API keys. Never imported in client components.
- `lib/llm/` — provider adapter and `generateJson()` helper. Server-side only.
- `lib/workflow/stages/` — individual bounded stage functions. Server-side only.
- `app/api/campaign/run/route.ts` — **full orchestration endpoint**. Accepts a raw brief text, runs all eight implemented stages in sequence, and returns the complete run output. The homepage calls this endpoint.
- `app/api/campaign/normalize/route.ts` — normalization API endpoint (individual stage).
- `app/api/campaign/tension/route.ts` — strategic tension API endpoint.
- `app/api/campaign/routes/route.ts` — route generation API endpoint.
- `app/api/campaign/personas/route.ts` — persona building API endpoint.
- `app/api/campaign/simulations/route.ts` — simulation API endpoint.
- `app/api/campaign/scores/route.ts` — scoring API endpoint. Deterministic. Works without `OPENAI_API_KEY`.
- `app/api/campaign/premortem/route.ts` — pre-mortem review API endpoint.
- `app/api/campaign/comparison/route.ts` — comparison API endpoint. Deterministic. Works without `OPENAI_API_KEY`.

Client components call `/api/campaign/run`, not stage functions directly. No API keys or env vars are exposed to the browser.

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

## `premortem_review` stage notes

- Server-side only. Never exposed to the browser.
- Consumes validated `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoute[]`, `Persona[]`, `PersonaSimulation[]`, and `RouteScore[]`.
- Produces a structured risk review: `summary`, one `routeRisk` per route, `overallRisks`, and `decisionWarnings`.
- This is a strategic risk analysis, not market research. Synthetic reactions and scores are planning hypotheses only.
- Must never claim campaign success probability or present synthetic data as validated customer evidence.
- Output is validated with `premortemReviewOutputSchema` (Zod wrapper) before returning.
- Coverage is validated with `validatePremortemCoverage` (in `lib/workflow/validate-premortem.ts`) after Zod validation — every input route must have exactly one `routeRisk` entry.
- Coverage failures throw `WorkflowValidationError`.
- Retries once on JSON parse, schema validation, or coverage failure.
- Prompt version: `premortem_review.v1`.
- API: `POST /api/campaign/premortem` — accepts bare arrays or wrapper objects for routes/personas/simulations/scores.

## `compare_routes` stage notes

- Server-side only. Never exposed to the browser.
- **Deterministic.** Does not call an LLM. Does not read `CAMPAIGN_SANDBOX_LLM_PROVIDER`. Works without `OPENAI_API_KEY`.
- Consumes validated `CampaignRoute[]`, `Persona[]`, `PersonaSimulation[]`, `RouteScore[]`, and `PremortemReview`.
- Computes per-route `weightedTotal`, `audienceResonance`, `conversionPotential`, `feasibility`, and `riskLevel` from scoring signals and premortem data.
- Recommends the route with the highest `weightedTotal`, with a fallback if the top-ranked route has high risk and another is close.
- Output is a `RouteComparisonMatrix`: `rows` (one per route), `recommendedRouteId`, `summary`, and `decisionNotes`.
- All numeric dimensions are bounded to [1, 5]. Comparison is decision support, not a prediction.
- Human selection remains required before final plan generation.
- Validates simulation, score, and premortem coverage before running.
- Validates comparison coverage (one row per route, unique IDs, recommendedRouteId references a known route) after running.
- Coverage failures throw `WorkflowValidationError`.
- Trace event: `provider: "deterministic"`, `model: "compare-routes-v1"`, `costUsd: 0`.
- API: `POST /api/campaign/comparison` — accepts bare arrays or wrapper objects for routes/personas/simulations/scores. Accepts `premortemReview` or `review` key.

## `/api/campaign/run` orchestration notes

- Accepts `{ text: string, mode?: "fast" | "deep" }` (text minimum 20 characters; mode defaults to `"fast"`).
- **Fast mode** (default): caps routes at 3 and personas at 3 (max 9 simulations). Pre-mortem receives compact simulation data to reduce prompt size and latency.
- **Deep mode**: all routes and personas generated by each stage proceed downstream.
- Runs all eight implemented stages in sequence with a shared `runId` regardless of mode.
- LLM-backed stages use the configured provider; deterministic stages always run without LLM calls.
- Returns `CampaignRunOutput`: all stage outputs plus trace events from every stage.
- Validates final output against `campaignRunOutputSchema` before returning.
- Never exposes raw OpenAI output, stack traces, or API keys in the response.
- The homepage calls this endpoint with the user's pasted brief.

## Provider adapter (timeout support)

`lib/llm/generate-json.ts` accepts an optional `timeoutMs` parameter (default 120,000ms). It uses `AbortController` to cancel requests that exceed the timeout and throws `LlmProviderError` with a descriptive message. No streaming, no SSE — the full response is awaited synchronously.

## UI layout and decision support

The result view is organized as a decision workspace:

1. **Section navigation** — `SectionNav` lets users jump between major sections.
2. **Run metadata** — `RunMetadataPanel` shows provider, model, runtime, counts, and recommended route derived from trace events.
3. **Executive summary** — `ExecutiveSummaryPanel` shows the recommended route, why it leads, primary risk, and a decision note. This is always visible above detail sections.
4. **Normalized brief + tension** — structured brief and strategic tension.
5. **Routes** — `CampaignRouteCard` grid with rank, score, and relative label (e.g. "Strongest overall").
6. **Simulations** — `CollapsibleSection` wrapping `PersonaSimulationPanel`. Collapsed by default.
7. **Risks** — `CollapsibleSection` wrapping pre-mortem review with route-level risks and overall risks.
8. **Comparison matrix** — `RouteComparisonTable` with sortable scores, badges, and expandable detail rows.
9. **Human selection** — placeholder for future route selection and execution plan generation.
10. **Trace** — `CollapsibleSection` wrapping `TraceTimeline`. Collapsed by default.

No persistence, no streaming, no PDF export, no auth in v1.

## Next steps

Human selection, execution plan generation, and export artifact remain not implemented. These require human gate integration before final plan synthesis.
