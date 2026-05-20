# Campaign Sandbox Constitution

Campaign Sandbox is a creative strategy simulation workspace. Read the project references before changing core behavior:

- `docs/architecture.md`
- `docs/workflow_spec.md`
- `docs/evals.md`
- `docs/safety.md`
- `docs/observability.md`
- `agents/agent_specs.yaml`
- `tools/tool_registry.yaml`

## Working Principles

- Prefer deterministic workflow code over autonomous agent behavior.
- Keep LLM work bounded by schemas, prompts, evals, and trace events.
- Preserve uncertainty from the brief instead of inventing certainty.

## Product Standards

- The product supports creative decisions; it does not replace human judgment.
- Synthetic audience reactions are never real research.
- Route scores are strategic estimates, not predictions.
- Human selection is required before final plan synthesis.

## Development Standards

- Keep diffs small and coherent.
- Do not add dependencies unless they serve the current scope.
- Keep prompt files, schemas, workflow specs, and docs aligned.
- Run typecheck, tests, and lint before handoff.

## Safety Boundaries

- No exact success probabilities without real historical data.
- No hidden assumptions in final plans.
- No secrets, API keys, auth, billing, or database changes in v1.

## Completion Standard

A change is complete when the UI works, schemas validate, tests cover the touched behavior, trace events remain valid, and docs reflect any workflow or safety changes.
