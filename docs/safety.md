# Safety

Campaign Sandbox is decision support, not real market research.

## Non-negotiable rules

- Never present synthetic persona reactions as real audience research.
- Never claim exact success probability without real historical data.
- Label route scores as strategic estimates, not predictions.
- Require human route selection before final plan generation.
- Include assumptions, risks, channels, assets, timeline, and metrics in final plans.

## LLM stage rules

These rules apply to all real LLM stages (`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, `simulate_reactions`, `premortem_review`, and future stages):

- Prompts must instruct the model to preserve uncertainty as open questions, not convert it to fabricated certainty.
- Prompts must not request probability claims or market predictions.
- Schema validation with Zod is required before returning any model output.
- Unvalidated model output must never reach callers or the UI.
- If validation fails after retries, a typed error is returned, not raw model text.

## Provider safety

- `OPENAI_API_KEY` is server-side only. It must never be exposed in the browser. Never set it with `NEXT_PUBLIC_` prefix.
- The app builds and runs without any API key when provider is `mock`.
- If provider is `openai` and the key is missing, the API call fails with a typed error — the app does not crash silently.
- Mock mode is the default and the safe baseline for CI, Vercel public demos, and local development. No real data or secrets are required.
- Real provider mode is enabled only by explicitly setting `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` plus a valid `OPENAI_API_KEY`. This must not happen automatically.
- `pnpm test:real-chain` is for local manual verification only. It assumes a running dev server and does not run in CI or `verify:full`.

## API error sanitization

All API routes map LLM errors to sanitized public responses. Raw provider output, model text, API keys, stack traces, and provider internals are never returned to clients. LLM error responses use:

```json
{ "error": "LLM stage failed.", "code": "LLM_PROVIDER_ERROR | LLM_JSON_PARSE_ERROR | LLM_SCHEMA_VALIDATION_ERROR" }
```

Validation errors include path and message for developer use but contain no raw model content.

## What remains synthetic

Even when all seven real stages use a real provider (or deterministic engine):

- All stages after `premortem_review` remain mocked.
- `generate_campaign_routes` generates strategic options, not market predictions. It does not use real market data.
- Routes are decision-support material, not campaign performance forecasts.
- Persona reactions are synthetic, not real audience research.
- Route scores are bounded strategic estimates from deterministic scoring logic. They are not predictions, probabilities, or market research.
- The pre-mortem review is a structured risk analysis — not market research, not a success prediction.
- The comparison matrix and execution plan are built from mock data.

## `extract_strategic_tension` safety rules

- The stage consumes validated `NormalizedCampaignBrief` objects only — never raw brief text.
- The prompt explicitly prohibits inventing market research or making probability claims.
- Output is validated with `strategicTensionSchema` before returning. Unvalidated output never reaches callers.
- The tension is strategic interpretation of the brief only, not a prediction of campaign performance.

## `generate_campaign_routes` safety rules

- The stage consumes validated `NormalizedCampaignBrief` and `StrategicTension` objects only — never raw brief text.
- The prompt explicitly prohibits real performance data, probability claims, and success predictions.
- Output is validated with `campaignRoutesOutputSchema` (Zod) before returning. Unvalidated output never reaches callers.
- `campaignRoutesOutputSchema` enforces required strategic roles (`safest`, `boldest`, `conversion`) and unique route IDs at the schema layer — the prompt alone is not sufficient.
- Routes are strategic options for human review and selection, not recommendations or predictions.
- `sampleCopy` must be campaign-safe copy examples, not guaranteed claims.
- Every route must include at least one risk (enforced by schema and prompt).

## `build_personas` safety rules

- The stage consumes validated `NormalizedCampaignBrief`, `StrategicTension`, and `CampaignRoute[]` only — never raw brief text.
- Personas are synthetic audience hypotheses. They are not real research, do not represent real people, and must never be presented as real audience data.
- Personas do not predict real behavior. Simulation results based on personas are estimates, not market research.
- The prompt explicitly prohibits inventing statistics, market share figures, survey data, or behavior claims.
- Protected characteristics (race, religion, national origin, disability status, sexual orientation) must not be used as targeting criteria. The prompt enforces this.
- Sensitivities in personas relate to campaign style and tone, not personal attributes of protected classes.
- Output is validated with `personasOutputSchema` (Zod) before returning. Unvalidated output never reaches callers.
- `personasOutputSchema` enforces unique persona IDs at the schema layer.
- Personas must not be passed to external services or used to target individuals.

## `simulate_reactions` safety rules

- The stage consumes validated `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoute[]`, and `Persona[]` only — never raw brief text.
- Simulations are synthetic planning devices. They are not real audience research, do not predict real behavior, and must never be presented as market validation, conversion evidence, or survey findings.
- Every simulation must include a caveat explicitly labeling the reaction as synthetic. This is enforced at the schema layer (`personaSimulationsOutputSchema`) — any simulation without "synthetic" in its caveat is rejected.
- Scores (`resonanceScore`, `conversionIntent`, `signupIntent`) are bounded qualitative strategy scores (1–5), not probabilities. They are never presented as conversion rates, click-through rates, or success predictions.
- `confidence` reflects certainty in the synthetic interpretation only, not real-world outcome certainty.
- The prompt explicitly prohibits inventing survey data, social data, purchase history, market data, or test results.
- The prompt prohibits using protected-class characteristics as targeting or reasoning criteria.
- Output is validated with `personaSimulationsOutputSchema` (Zod) before returning. Unvalidated output never reaches callers.
- Cross-reference coverage is validated with `validateSimulationCoverage` — unknown route/persona IDs and missing pairs are rejected as `LlmSchemaValidationError`.
- Full matrix coverage (every route/persona pair) is required. Partial simulation sets are not accepted.
- Simulations must not be passed to external services or used as evidence of real audience behavior.

## `score_routes` safety rules

- Deterministic. Does not call an LLM. Does not use `OPENAI_API_KEY`. Works in all provider modes.
- Scores are bounded qualitative strategic estimates (1–5). They are not probabilities, success predictions, or market research.
- Scores support human route comparison and selection — they do not replace judgment.
- All score dimensions and `weightedTotal` are clamped to [1, 5] in code.
- No exact success probabilities are produced. No real historical data is claimed.
- Full simulation coverage (every route/persona pair) is required before scoring. Missing or unknown pairs throw `WorkflowValidationError` — not silently scored.
- Score coverage (one score per route, no duplicates) is validated after scoring.
- Trace event labels the provider as `"deterministic"` so it is distinguishable from LLM stages.
- Scores must not be presented as conversion predictions, A/B test results, or market validation.

## `premortem_review` safety rules

- The stage consumes validated `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoute[]`, `Persona[]`, `PersonaSimulation[]`, and `RouteScore[]` only — never raw brief text.
- This is a structured risk analysis, not market research. It must not claim campaign success probability or present synthetic reactions as validated customer evidence.
- The prompt explicitly prohibits claiming real-world certainty, inventing market outcomes, or using scores as proof of campaign performance.
- Synthetic reactions and route scores are treated as planning hypotheses only — supporting evidence, not validation.
- Output is validated with `premortemReviewOutputSchema` (Zod) before returning. Unvalidated output never reaches callers.
- Coverage is validated with `validatePremortemCoverage` — every input route must have exactly one `routeRisk` entry. Unknown route IDs and missing or duplicate entries throw `WorkflowValidationError`.
- `decisionWarnings` must always remind the team that scores are strategic estimates and synthetic reactions are not real research.
- Retries once on JSON parse, schema validation, or coverage failure.

## Future LLM integrations

Each new real stage must enforce these rules at prompt, schema, workflow, UI, and export layers. The same server boundary pattern (stage function → API route → schema validation → trace event → sanitized error handling) is required.
