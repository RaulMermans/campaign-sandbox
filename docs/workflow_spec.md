# Workflow Spec

`normalize_brief` turns raw text into a structured brief while preserving uncertainty.

`extract_strategic_tension` identifies the core contradiction and opportunity.

`generate_campaign_routes` creates 3–5 meaningfully distinct routes. The `campaignRoutesOutputSchema` enforces at least one `safest`, `boldest`, and `conversion` route and unique route IDs — these constraints are validated at the schema layer, not just the prompt. Routes are strategic options for human evaluation, not performance predictions. This stage is server-side only, consuming validated `NormalizedCampaignBrief` and `StrategicTension` inputs. Available as a real bounded LLM stage or mock.

`build_personas` creates 3–6 synthetic personas grounded in the normalized brief, strategic tension, and campaign routes. Personas are synthetic audience hypotheses for planning purposes only — they are not real research, do not predict behavior, and must not be presented as real data or used for discriminatory targeting. This stage is server-side only, consuming all three validated upstream inputs. Available as a real bounded LLM stage or mock.

`simulate_reactions` generates one synthetic reaction for every route/persona pair. The output is a full matrix: R routes × P personas = R×P simulations. Each simulation includes a likely reaction, positives, objections, a quoted reaction, bounded strategy scores (1–5), a confidence level, and a caveat that must explicitly label the reaction as synthetic. Simulations are planning devices — they are not real audience research, do not predict real behavior, and must never be used as market validation, survey data, or conversion evidence. Scores are qualitative estimates, not probabilities. This stage is server-side only, consuming validated normalizedBrief, strategicTension, routes, and personas. Available as a real bounded LLM stage or mock. Everything after `simulate_reactions` remains mocked.

`score_routes` applies deterministic weights and labels all scores as strategic estimates.

`premortem_review` identifies route-specific and overall failure modes.

`compare_routes` creates a matrix for human decision-making.

`human_selection` is required before final plan generation.

`generate_execution_plan` produces assumptions, risks, channels, assets, timeline, metrics, copy examples, and next actions.

`export_artifact` will later package the final plan and trace into a shareable artifact.
