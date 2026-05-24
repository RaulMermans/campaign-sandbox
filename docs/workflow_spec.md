# Workflow Spec

## Stage status

| Stage | Status |
|---|---|
| `normalize_brief` | **Real (optional)** — server-side, OpenAI or mock |
| `extract_strategic_tension` | **Real (optional)** — server-side, OpenAI or mock |
| `generate_campaign_routes` | **Real (optional)** — server-side, OpenAI or mock |
| `build_personas` | Mocked |
| `simulate_reactions` | Mocked |
| `score_routes` | Deterministic |
| `premortem_review` | Mocked |
| `compare_routes` | Deterministic |
| `human_selection` | Human gate |
| `generate_execution_plan` | Mocked |
| `export_artifact` | Placeholder |

## Stage descriptions

`normalize_brief` turns raw text into a structured brief while preserving uncertainty.

`extract_strategic_tension` identifies the core contradiction and opportunity.

`generate_campaign_routes` creates 3–5 routes: at least one safest, one boldest, one conversion-oriented.

`build_personas` creates synthetic personas for simulation only.

`simulate_reactions` estimates likely synthetic persona reactions, objections, and intent signals.

`score_routes` applies deterministic weights and labels all scores as strategic estimates.

`premortem_review` identifies route-specific and overall failure modes.

`compare_routes` creates a matrix for human decision-making.

`human_selection` is required before final plan generation.

`generate_execution_plan` produces assumptions, risks, channels, assets, timeline, metrics, copy examples, and next actions.

`export_artifact` will later package the final plan and trace into a shareable artifact.
