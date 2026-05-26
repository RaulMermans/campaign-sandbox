# Workflow Spec

`normalize_brief` turns raw text into a structured brief while preserving uncertainty.

`extract_strategic_tension` identifies the core contradiction and opportunity.

`generate_campaign_routes` creates 3–5 meaningfully distinct routes including at least one safest, boldest, and conversion-oriented option. Routes are strategic options for human evaluation, not performance predictions. This stage is server-side only, consuming validated `NormalizedCampaignBrief` and `StrategicTension` inputs. Available as a real bounded LLM stage or mock.

`build_personas` creates synthetic personas for simulation only.

`simulate_reactions` estimates likely synthetic persona reactions, objections, and intent signals.

`score_routes` applies deterministic weights and labels all scores as strategic estimates.

`premortem_review` identifies route-specific and overall failure modes.

`compare_routes` creates a matrix for human decision-making.

`human_selection` is required before final plan generation.

`generate_execution_plan` produces assumptions, risks, channels, assets, timeline, metrics, copy examples, and next actions.

`export_artifact` will later package the final plan and trace into a shareable artifact.
