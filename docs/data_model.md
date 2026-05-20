# Data Model

Planned entities:

- `projects`: top-level workspace containers.
- `campaign_runs`: workflow executions tied to a brief and trace.
- `briefs`: raw and normalized campaign brief records.
- `routes`: generated strategic campaign directions.
- `personas`: synthetic personas used only for simulation.
- `simulations`: synthetic reactions by persona and route.
- `scores`: deterministic strategic estimates for route comparison.
- `risk_reviews`: pre-mortem risks and mitigations.
- `final_plans`: execution-ready plans after human selection.
- `artifacts`: exported documents or shareable deliverables.
- `trace_events`: auditable workflow events emitted by every stage.

No real database exists in v1. The schemas define the persistence boundary for later Supabase/Postgres work.
