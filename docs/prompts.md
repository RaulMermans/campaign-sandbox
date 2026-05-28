# Prompts

Prompt files live in `prompts/` as markdown and are loaded by name through `lib/prompts/load-prompt.ts`.

## Prompt discipline

- One file per bounded LLM stage.
- Keep output schema expectations explicit in the prompt.
- Instruct the model to return **JSON only** — no markdown, no commentary, no text before or after the object.
- Preserve uncertainty from the brief: unresolved items go in `openQuestions`, not invented facts.
- Keep safety rules (no probability claims, no fabricated certainty) inside the prompt.
- Version prompt changes through normal code review.
- Do not inline production prompts inside UI components or route handlers.
- Prompts are loaded server-side only via `loadPrompt()`, which reads from disk at request time.

## Prompt versioning

Trace events include a `promptVersion` field (e.g. `"normalize_brief.v1"`) so production runs can be traced back to a specific prompt version. Increment the version suffix when the prompt changes in a way that could affect output structure or safety rules.

## Active prompts

| File | Stage | Status |
|---|---|---|
| `prompts/normalize_brief.md` | `normalize_brief` | Active — used in OpenAI mode |
| `prompts/extract_strategic_tension.md` | `extract_strategic_tension` | Active — used in OpenAI mode |
| `prompts/generate_campaign_routes.md` | `generate_campaign_routes` | Active — used in OpenAI mode |
| `prompts/build_personas.md` | `build_personas` | Active — used in OpenAI mode |
| `prompts/simulate_audience_reactions.md` | `simulate_reactions` | Active — used in OpenAI mode |
| `prompts/premortem_review.md` | `premortem_review` | Active — used in OpenAI mode |
| `prompts/generate_execution_plan.md` | `generate_execution_plan` | Mocked — not yet wired |

## `generate_campaign_routes` prompt notes

The prompt for `generate_campaign_routes.md` (version `generate_campaign_routes.v1`):

- Instructs the model to return JSON only — no prose, no markdown, no text before or after the object.
- Maps to `campaignRoutesOutputSchema` (a Zod object wrapper around `z.array(campaignRouteSchema).min(3).max(5)`).
- Requires 3–5 routes that are genuinely different strategic territories, not cosmetic variations.
- Requires at least one `safest`, one `boldest`, and one `conversion` route.
- Prohibits real performance data, probability claims, and market predictions.
- Requires every route to include at least one risk.
- Appends both `NormalizedCampaignBrief` and `StrategicTension` as JSON under separate sections.
- Output is validated with Zod before returning; retries once on parse or schema failure.
- Uses an object wrapper (`{ "routes": [...] }`) because OpenAI JSON mode expects an object, not a top-level array.

## `build_personas` prompt notes

The prompt for `build_personas.md` (version `build_personas.v1`):

- Instructs the model to return JSON only — no prose, no markdown, no text before or after the object.
- Maps to `personasOutputSchema` (a Zod object wrapper around `z.array(personaSchema).min(3).max(6)`).
- Requires 3–6 personas that are meaningfully different audience segments, not demographic clones.
- Prohibits inventing statistics, market share, survey data, or behavior claims.
- Prohibits using protected characteristics as targeting criteria.
- Requires each persona to include `sensitivities` that help route simulation avoid cliché campaign thinking.
- Appends `NormalizedCampaignBrief`, `StrategicTension`, and `CampaignRoutes` as JSON under separate sections.
- Output is validated with Zod before returning; retries once on parse or schema failure.
- Uses an object wrapper (`{ "personas": [...] }`) because OpenAI JSON mode expects an object, not a top-level array.

## `simulate_audience_reactions` prompt notes

The prompt for `simulate_audience_reactions.md` (version `simulate_reactions.v1`):

- Instructs the model to return JSON only — no prose, no markdown, no text before or after the object.
- Maps to `personaSimulationsOutputSchema` (a Zod object wrapper around `z.array(personaSimulationSchema).min(1)` with cross-reference superRefine checks).
- Requires exactly one simulation for every route/persona pair. If there are R routes and P personas, R × P simulations are required.
- Scores (`resonanceScore`, `conversionIntent`, `signupIntent`) must be 1–5. They are bounded qualitative strategy scores, not probabilities.
- `confidence` is `"low"`, `"medium"`, or `"high"` — reflects certainty in the synthetic interpretation only.
- Every `caveat` must explicitly state the reaction is synthetic and is not real audience research.
- Prohibits inventing survey data, social data, purchase history, market data, or test results.
- Prohibits using protected-class characteristics as targeting or reasoning criteria.
- Appends `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoutes`, and `Personas` as JSON under separate sections.
- Output is validated with Zod and `validateSimulationCoverage` before returning; retries once on parse, schema, or coverage failure.
- Uses an object wrapper (`{ "simulations": [...] }`) because OpenAI JSON mode expects an object, not a top-level array.

## `extract_strategic_tension` prompt notes

The prompt for `extract_strategic_tension.md` (version `extract_strategic_tension.v1`):

- Instructs the model to return JSON only — no prose, no markdown.
- Maps exactly to `strategicTensionSchema` in `lib/schemas/campaign.ts`.
- Does not request market research or probability claims.
- Requires `avoid` to be campaign-specific (not generic advice).
- Appends the full `NormalizedCampaignBrief` as JSON under a `## NORMALIZED BRIEF` section.
- Output is validated with Zod before returning; retries once on parse or schema failure.

## `premortem_review` prompt notes

The prompt for `premortem_review.md` (version `premortem_review.v1`):

- Instructs the model to return JSON only — no prose, no markdown, no text before or after the object.
- Maps to `premortemReviewOutputSchema` (a Zod object wrapper around `premortemReviewSchema`).
- Requires exactly one `routeRisk` entry per input route. Uses only the route IDs provided — no invented routes.
- Each `routeRisk` must include at least two specific risks and at least two actionable mitigations.
- `overallRisks` and `decisionWarnings` must each contain at least two items.
- Instructs the model to be critical — not to flatter every route. Identifies: weak assumptions, cliché risks, feasibility issues, cultural risks, conversion risks, and channel risks.
- Explicitly prohibits claiming campaign success probability or treating synthetic data as real customer evidence.
- Synthetic reactions and route scores are used as supporting evidence only — never as proof of market outcomes.
- Appends `NormalizedCampaignBrief`, `StrategicTension`, `CampaignRoutes`, `Personas`, `Simulations`, and `RouteScores` as JSON under separate sections.
- Output is validated with Zod and `validatePremortemCoverage` before returning; retries once on parse, schema, or coverage failure.
- Uses an object wrapper (`{ "review": { ... } }`) because OpenAI JSON mode expects an object.

## Output format requirements (all prompts)

- JSON only
- No markdown wrapping
- No commentary before or after the object
- No probability claims
- Preserve assumptions and missing information from the brief
- Separate facts from inferred assumptions
- Match the Zod schema defined in `lib/schemas/campaign.ts`
