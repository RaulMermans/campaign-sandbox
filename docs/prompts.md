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
| `prompts/build_personas.md` | `build_personas` | Mocked — not yet wired |
| `prompts/simulate_audience_reactions.md` | `simulate_reactions` | Mocked — not yet wired |
| `prompts/premortem_review.md` | `premortem_review` | Mocked — not yet wired |
| `prompts/generate_execution_plan.md` | `generate_execution_plan` | Mocked — not yet wired |

## `extract_strategic_tension` prompt notes

The prompt for `extract_strategic_tension.md` (version `extract_strategic_tension.v1`):

- Instructs the model to return JSON only — no prose, no markdown.
- Maps exactly to `strategicTensionSchema` in `lib/schemas/campaign.ts`.
- Does not request market research or probability claims.
- Requires `avoid` to be campaign-specific (not generic advice).
- Appends the full `NormalizedCampaignBrief` as JSON under a `## NORMALIZED BRIEF` section.
- Output is validated with Zod before returning; retries once on parse or schema failure.

## Output format requirements (all prompts)

- JSON only
- No markdown wrapping
- No commentary before or after the object
- No probability claims
- Preserve assumptions and missing information from the brief
- Separate facts from inferred assumptions
- Match the Zod schema defined in `lib/schemas/campaign.ts`
