# Safety

Campaign Sandbox is decision support, not real market research.

## Non-negotiable rules (updated for v1 sprint)

- No file storage: uploaded briefs are processed in-memory and discarded after extraction.
- No OCR: image-only PDFs return a warning, not silent empty text.
- No LLM calls before user consent: extracted text is shown and editable before any run starts.
- No autonomous agents: the skill layer is prompt injection only — no tools, no memory, no multi-step agent loops.
- Skill content appears in prompts as bounded instructions, not as model instructions to act independently.

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

Even when all eight implemented stages run (six with a real LLM provider, two deterministic):

- `generate_campaign_routes` generates strategic options, not market predictions. It does not use real market data.
- Routes are decision-support material, not campaign performance forecasts.
- Persona reactions are synthetic, not real audience research.
- Route scores are bounded strategic estimates from deterministic scoring logic. They are not predictions, probabilities, or market research.
- The pre-mortem review is a structured risk analysis — not market research, not a success prediction.
- The comparison matrix is a decision-support tool built from deterministic scoring signals. It is not a prediction or market validation.
- Human selection is explicit: no execution plan is generated until the user clicks a route button and then clicks "Generate execution plan." The system recommendation from `compare_routes` is guidance only and is never auto-applied.
- Export artifact is deterministic — no LLM is used in report generation.
- The export report includes explicit synthetic-research caveats in every section that references persona scores or simulation results.
- The export report includes a legal/substantiation checklist identifying claim categories that require review before publication.
- No PDF export in v1. No persistence. No auth. No billing.
- The HTML renderer escapes all user/model-generated text to prevent XSS injection in the exported file.

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

## Route Quality Gate v1 safety rules

- The quality gate is deterministic. It does not call an LLM and does not produce its own output — it only validates LLM-generated routes against structural quality signals.
- The gate checks: forbidden generic name patterns, motivational-platitude killer lines, insufficient visual world (fewer than 2 concrete entries), unsupported proof claims (fake testimonials without safe qualifiers such as "if available" or "testimonial-style creative"), and vague failure modes.
- Issues are typed (`RouteQualityIssue`): field, severity (`warning` | `error`), message. Raw model output is never propagated.
- Blocking errors trigger a single repair retry using a focused prompt that lists only the specific issues. The LLM is not given back the original raw response — only the validated structured output plus the issue list.
- After the retry, surviving quality warnings are preserved in `qualityWarnings` on the result for caller awareness. They do not block workflow execution.
- The gate never manufactures certainty: warnings reflect structural signals only, not assertions about market fit or audience response.

## Proof Integrity Guardrail safety rules

- The proof integrity guardrail is deterministic. It does not call an LLM.
- It checks route `proofMechanism`, `activationIdeas`, `assetIdeas`, and execution plan `strategicSummary`, `launchPhases`, `channelPlan`, and `assetList` for unsupported claims that imply real customer testimonials, user-generated content, or verified customer reviews.
- It is brief-aware: if the brief explicitly provides evidence of customer proof (testimonials, case studies, UGC, customer reviews), all proof-related language is permitted.
- Safe language qualifiers that allow proof-adjacent copy: `"testimonial-style creative"`, `"if available"`, `"customer proof if available"`.
- Issues are typed (`ProofIntegrityIssue`): field, severity (`error`), message. Raw model output is never propagated.
- The guardrail is an advisory layer in v1 — it flags issues for the system and logs them as trace-compatible data, but does not block plan generation automatically. It is used to validate prompt compliance and catch regression.

## Deterministic derivation safety rules (`buildDecisionSummary`, `deriveRiskTaxonomy`, `deriveRouteSimulationSummaries`)

- All three derivations are deterministic and do not call an LLM.
- `buildDecisionSummary`: the recommended route is derived from score ranking only — no LLM judgment. `whyItWins`, `runnerUpStrength`, and `biggestTradeoff` are derived from comparison summary text and premortem notes, not invented. Risk type is classified from structural signals (feasibility score, premortem keywords, distinctiveness/conversion gap). The `closeScoreNotice` is shown when the top-two score gap is ≤ 0.2 to prevent false certainty in close decisions.
- `deriveRiskTaxonomy`: risk types are structural labels (Execution risk, Proof risk, Conversion risk, Channel risk, Brand dilution risk, Creative risk) derived from scores and premortem text. They are not predictions of campaign failure or success probability.
- `deriveRouteSimulationSummaries`: averages are arithmetic means of bounded 1–5 scores from synthetic simulations. They are not conversion rates, not real audience data, and must not be presented as market research. Safe N/A values are returned for routes with no simulations rather than crashing or fabricating scores.

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

## `compare_routes` safety rules

- Deterministic. Does not call an LLM. Does not use `OPENAI_API_KEY`. Works in all provider modes.
- Comparison dimensions (weighted total, audience resonance, conversion potential, feasibility) are bounded to [1, 5]. They are not probabilities, success predictions, or market research.
- The comparison matrix is decision support — it does not replace human judgment. Human selection is required before generating an execution plan.
- Risk levels (`low`, `medium`, `high`) are derived from the premortem risk count. They are heuristic indicators, not risk assessments.
- `recommendedRouteId` is a scoring-based suggestion, not a prediction of campaign success.
- `decisionNotes` always remind the team that scores are strategic estimates and synthetic reactions are not real research.
- Comparison output must never be presented as market validation, A/B test results, or conversion evidence.
- Full simulation, score, and premortem coverage is required before comparing. Missing coverage throws `WorkflowValidationError`.

## `POST /api/campaign/run` safety rules

- Accepts raw brief text. Validates minimum length (20 characters). Rejects non-JSON bodies.
- Accepts optional `mode: "fast" | "deep"`. Rejects any other value. Defaults to `"fast"`.
- Orchestrates eight stages server-side. No client-side LLM calls. No API keys exposed to the browser.
- All stage outputs are validated with Zod before the next stage receives them.
- Final output is validated with `campaignRunOutputSchema` before returning.
- Provider errors, LLM JSON parse failures, schema validation failures, and workflow coverage failures are all caught and sanitized. Raw model output, stack traces, and API keys are never returned.
- The response is labeled `status: "completed"` only after all eight stages succeed.

## Budget handling safety

- If a brief does not specify a budget, the output must not set `budget.min` or `budget.max` to `0` as a placeholder.
- `budget.label` should be `"Not specified"` when the brief contains no budget information.
- The UI must never display `"USD 0-0"` or equivalent for unknown budget.
- The `budget` field in `normalizedCampaignBriefSchema` is optional — it may be absent.

## `POST /api/campaign/execution-plan` safety rules

- Accepts a completed run result plus an explicit `selectedRouteId`. Never accepts raw brief text.
- Validates `selectedRouteId` against the provided routes array. Returns 422 with `INVALID_SELECTED_ROUTE` if the ID is not found.
- Generates a plan for the selected route only. Does not produce plans for other routes.
- The execution plan is a strategic planning document, not market research.
- Synthetic audience reactions used in plan generation are planning hypotheses only. They must not be presented as validated customer evidence.
- The plan must not claim predicted success rates, conversion probabilities, or ROI.
- `assumptions` in the plan must explicitly state that synthetic reactions are hypotheses, not validated evidence.
- Claims touching time, sustainability, savings, or behavior change require legal and substantiation review before publication — the plan must note this.
- Provider errors, LLM JSON parse failures, schema validation failures, and workflow validation failures are caught and sanitized. Raw model output, stack traces, and API keys are never returned.

## `generate_execution_plan` stage safety rules

- Must validate `selectedRouteId` via `validateSelectedRoute` before calling the LLM.
- Throws `WorkflowValidationError` if `selectedRouteId` is not found.
- Output validated against `campaignExecutionPlanOutputSchema` before returning.
- Retries once on `LlmJsonParseError` or `LlmSchemaValidationError`. Does not retry on provider or network errors.
- Never returns unvalidated model output.

## Skill layer v2 safety rules

- Skill content is plain text injected into prompt files via `<!-- skill:name -->` marker replacement at runtime (`composePrompt()`).
- Skills are bounded prompt instructions — not tool calls, not memory, not multi-step agent loops, not autonomous decision-making.
- Unresolved markers throw in non-production environments so missing skills are caught immediately. In production, unresolved markers are left intact rather than silently injecting empty content.
- Skill content must not instruct the model to act independently, call external services, or bypass the standard schema + validation path.
- The composed prompt is never returned to the client and is never logged in full in production telemetry.

## `generate_execution_plan` proof integrity rules

- The execution plan prompt explicitly prohibits implying that real customer testimonials, user-generated content, satisfied subscriber quotes, or verified customer reviews exist unless the brief explicitly provides them.
- Permitted language: `"testimonial-style creative"` (style reference, not claim), `"customer proof if available"` (conditioned), `"scenario-based creative"` (fictional framing).
- The `validateProofIntegrity` guardrail checks execution plan output fields (`strategicSummary`, `launchPhases`, `channelPlan`, `assetList`) for violations. Issues are returned as typed `ProofIntegrityIssue` objects — raw plan text is never propagated as the error payload.

## Future LLM integrations

Each new real stage must enforce these rules at prompt, schema, workflow, UI, and export layers. The same server boundary pattern (stage function → API route → schema validation → trace event → sanitized error handling) is required.
