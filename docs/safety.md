# Safety

Campaign Sandbox is decision support, not real market research.

## Non-negotiable rules

- Never present synthetic persona reactions as real audience research.
- Never claim exact success probability without real historical data.
- Label route scores as strategic estimates, not predictions.
- Require human route selection before final plan generation.
- Include assumptions, risks, channels, assets, timeline, and metrics in final plans.

## LLM stage rules

These rules apply to all real LLM stages, starting with `normalize_brief`:

- Prompts must instruct the model to preserve uncertainty as open questions, not convert it to fabricated certainty.
- Prompts must not request probability claims or market predictions.
- Schema validation with Zod is required before returning any model output.
- Unvalidated model output must never reach callers or the UI.
- If validation fails after retries, a typed error is returned, not raw model text.

## Provider safety

- `OPENAI_API_KEY` is server-side only. It must never be exposed in the browser.
- The app builds and runs without any API key when provider is `mock`.
- If provider is `openai` and the key is missing, the API call fails with a typed error — the app does not crash silently.

## What remains synthetic

Even when `normalize_brief` uses a real provider:

- All subsequent stages remain mocked.
- Persona reactions are synthetic, not real audience research.
- Route scores are strategic estimates from deterministic scoring logic.
- The pre-mortem and comparison matrix are generated from mock data.
- The execution plan is built from mock routes and scores.

## Future LLM integrations

Each new real stage must enforce these rules at prompt, schema, workflow, UI, and export layers. The same server boundary pattern (stage function → API route → schema validation → trace event) is required.
