# Safety

Campaign Sandbox is decision support, not real market research.

## Non-negotiable rules

- Never present synthetic persona reactions as real audience research.
- Never claim exact success probability without real historical data.
- Label route scores as strategic estimates, not predictions.
- Require human route selection before final plan generation.
- Include assumptions, risks, channels, assets, timeline, and metrics in final plans.

## LLM stage rules

These rules apply to all real LLM stages (`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, and any future stages):

- Prompts must instruct the model to preserve uncertainty as open questions, not convert it to fabricated certainty.
- Prompts must not request probability claims or market predictions.
- Schema validation with Zod is required before returning any model output.
- Unvalidated model output must never reach callers or the UI.
- If validation fails after retries, a typed error is returned, not raw model text.

## Provider safety

- `OPENAI_API_KEY` is server-side only. It must never be exposed in the browser.
- The app builds and runs without any API key when provider is `mock`.
- If provider is `openai` and the key is missing, the API call fails with a typed error — the app does not crash silently.

## API error sanitization rules

- Never return raw provider response text to clients.
- Never return raw model output to clients.
- Never return API keys, env var names, stack traces, or provider internals in API responses.
- LLM/provider errors are mapped to safe public shapes: `{ error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" | "LLM_JSON_PARSE_ERROR" | "LLM_SCHEMA_VALIDATION_ERROR" }`.
- Validation errors may include detailed `issues` arrays for developer use (no secrets are present in validation errors).

## What remains synthetic

Even when all three real stages (`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`) use a real provider:

- `extract_strategic_tension` is strategic interpretation, not audience research. It does not use real market data.
- `generate_campaign_routes` generates strategic route options, not predictions.
- Routes do not use real market data.
- Routes do not simulate real audience behavior.
- Persona reactions are synthetic, not real audience research.
- Route scores are strategic estimates from deterministic scoring logic.
- The pre-mortem and comparison matrix are generated from mock data.
- The execution plan is built from mock routes and scores.

## `extract_strategic_tension` safety rules

- The stage consumes validated `NormalizedCampaignBrief` objects only — never raw brief text.
- The prompt explicitly prohibits inventing market research or making probability claims.
- Output is validated with `strategicTensionSchema` before returning. Unvalidated output never reaches callers.
- The tension is strategic interpretation of the brief only, not a prediction of campaign performance.

## Future LLM integrations

Each new real stage must enforce these rules at prompt, schema, workflow, API, UI, and export layers. The same server boundary pattern (stage function → API route → validated schema → sanitized errors → trace event) is required.
