# Workflow Spec

`normalize_brief` turns raw text into a structured brief while preserving uncertainty.

`extract_strategic_tension` identifies the core contradiction and opportunity.

`generate_campaign_routes` creates 3–5 meaningfully distinct routes. The `campaignRoutesOutputSchema` enforces at least one `safest`, `boldest`, and `conversion` route and unique route IDs — these constraints are validated at the schema layer, not just the prompt. Routes are strategic options for human evaluation, not performance predictions. This stage is server-side only, consuming validated `NormalizedCampaignBrief` and `StrategicTension` inputs. Available as a real bounded LLM stage or mock.

`build_personas` creates 3–6 synthetic personas grounded in the normalized brief, strategic tension, and campaign routes. Personas are synthetic audience hypotheses for planning purposes only — they are not real research, do not predict behavior, and must not be presented as real data or used for discriminatory targeting. This stage is server-side only, consuming all three validated upstream inputs. Available as a real bounded LLM stage or mock.

`simulate_reactions` generates one synthetic reaction for every route/persona pair. The output is a full matrix: R routes × P personas = R×P simulations. Each simulation includes a likely reaction, positives, objections, a quoted reaction, bounded strategy scores (1–5), a confidence level, and a caveat that must explicitly label the reaction as synthetic. Simulations are planning devices — they are not real audience research, do not predict real behavior, and must never be used as market validation, survey data, or conversion evidence. Scores are qualitative estimates, not probabilities. This stage is server-side only, consuming validated normalizedBrief, strategicTension, routes, and personas. Available as a real bounded LLM stage or mock.

`score_routes` is deterministic — it does not call an LLM and does not require `OPENAI_API_KEY`. It consumes validated `CampaignRoute[]`, `Persona[]`, and `PersonaSimulation[]`. Scoring uses simulation averages (resonance score, conversion intent) combined with route-level risk counts and role-default weights to compute bounded scores. All scores and `weightedTotal` are in [1, 5]. Scores are bounded qualitative strategic estimates, not probabilities or predictions. They support human comparison and selection; they do not replace judgment. Full simulation coverage is required (every route/persona pair must have exactly one simulation). Coverage failures throw `WorkflowValidationError`. Trace event: `provider: "deterministic"`, `model: "score-routes-v1"`, `costUsd: 0`.

`premortem_review` is a bounded LLM stage that identifies failure modes, weak assumptions, risks, and mitigations for each route and for the campaign overall. It consumes all six upstream validated inputs: `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoute[]`, `Persona[]`, `PersonaSimulation[]`, and `RouteScore[]`. Output is a `PremortemReview` with one `routeRisk` per route, `overallRisks`, `decisionWarnings`, and a `summary`. Coverage is enforced by `validatePremortemCoverage` — every input route must have exactly one entry. This is a strategic risk analysis, not market research. Synthetic reactions and scores are planning hypotheses only. The stage must not claim campaign success probability or treat synthetic data as real customer evidence. Coverage failures throw `WorkflowValidationError`. Retries once on JSON parse, schema validation, or coverage failure. Trace event: `provider: "mock"` or `"openai"`, `promptVersion: "premortem_review.v1"`. Available as a real bounded LLM stage or mock. Everything after `premortem_review` remains mocked.

`compare_routes` creates a matrix for human decision-making. Remains mocked.

`human_selection` is required before final plan generation.

`generate_execution_plan` produces assumptions, risks, channels, assets, timeline, metrics, copy examples, and next actions.

`export_artifact` will later package the final plan and trace into a shareable artifact.
