# Safety

Campaign Sandbox is decision support, not real market research.

## Non-negotiable rules

- Never present synthetic persona reactions as real audience research.
- Never claim exact success probability without real historical data.
- Label route scores as strategic estimates, not predictions.
- Require human route selection before final plan generation.
- Include assumptions, risks, channels, assets, timeline, and metrics in final plans.

## LLM stage rules

These rules apply to all real LLM stages (`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, and future stages):

- Prompts must instruct the model to preserve uncertainty as open questions, not convert it to fabricated certainty.
- Prompts must not request probability claims or market predictions.
- Schema validation with Zod is required before returning any model output.
- Unvalidated model output must never reach callers or the UI.
- If validation fails after retries, a typed error is returned, not raw model text.

## Provider safety

- `OPENAI_API_KEY` is server-side only. It must never be exposed in the browser.
- The app builds and runs without any API key when provider is `mock`.
- If provider is `openai` and the key is missing, the API call fails with a typed error — the app does not crash silently.

## API error sanitization

All API routes map LLM errors to sanitized public responses. Raw provider output, model text, API keys, stack traces, and provider internals are never returned to clients. LLM error responses use:

```json
{ "error": "LLM stage failed.", "code": "LLM_PROVIDER_ERROR | LLM_JSON_PARSE_ERROR | LLM_SCHEMA_VALIDATION_ERROR" }
```

Validation errors include path and message for developer use but contain no raw model content.

## What remains synthetic

Even when `normalize_brief`, `extract_strategic_tension`, and `generate_campaign_routes` use a real provider:

- All stages after `generate_campaign_routes` remain mocked.
- `generate_campaign_routes` generates strategic options, not market predictions. It does not use real market data.
- Routes are decision-support material, not campaign performance forecasts.
- Persona reactions are synthetic, not real audience research.
- Route scores are strategic estimates from deterministic scoring logic.
- The pre-mortem and comparison matrix are generated from mock data.
- The execution plan is built from mock routes and scores.

## `extract_strategic_tension` safety rules

- The stage consumes validated `NormalizedCampaignBrief` objects only — never raw brief text.
- The prompt explicitly prohibits inventing market research or making probability claims.
- Output is validated with `strategicTensionSchema` before returning. Unvalidated output never reaches callers.
- The tension is strategic interpretation of the brief only, not a prediction of campaign performance.

## `generate_campaign_routes` safety rules

- The stage consumes validated `NormalizedCampaignBrief` and `StrategicTension` objects only — never raw brief text.
- The prompt explicitly prohibits real performance data, probability claims, and success predictions.
- Output is validated with `campaignRoutesOutputSchema` (Zod) before returning. Unvalidated output never reaches callers.
- Routes are strategic options for human review and selection, not recommendations or predictions.
- `sampleCopy` must be campaign-safe copy examples, not guaranteed claims.
- Every route must include at least one risk (enforced by schema and prompt).

## Future LLM integrations

Each new real stage must enforce these rules at prompt, schema, workflow, UI, and export layers. The same server boundary pattern (stage function → API route → schema validation → trace event → sanitized error handling) is required.
