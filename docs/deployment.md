# Deployment

Campaign Sandbox is a Next.js application. This document covers local setup and Vercel deployment.

## Local development

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`. No environment variables are required for mock mode.

## Local verification before deploy

```bash
pnpm verify        # typecheck + lint + tests
pnpm verify:full   # typecheck + lint + tests + next build
```

Both must pass clean before deploying.

## Vercel deployment

### Automatic setup

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Vercel auto-detects Next.js. `vercel.json` provides explicit build and install commands.
4. Deploy without any environment variables to run in mock mode.

### Environment variables on Vercel

Set these in **Vercel → Project → Settings → Environment Variables**.

| Variable | Required | Default | Description |
|---|---|---|---|
| `CAMPAIGN_SANDBOX_LLM_PROVIDER` | No | `mock` | Set to `openai` to enable real brief normalization. |
| `OPENAI_API_KEY` | Only when provider is `openai` | — | Your OpenAI API key. Server-side only. Never expose to the browser. |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` | OpenAI model override. |

### Default mock deployment (no API keys needed)

Deploy without setting any environment variables. The app runs fully in mock mode:

- Brief input works.
- Mock normalized brief, routes, simulations, scores, and execution plan are returned when a route is selected.
- No OpenAI calls are made.
- No secrets are required.

### How the homepage works

The homepage calls `POST /api/campaign/run` with the user's pasted brief. This endpoint orchestrates all eight implemented stages server-side with a shared `runId`. In mock mode it returns deterministic outputs immediately. In OpenAI mode it calls the LLM for the six LLM-backed stages and uses deterministic logic for `score_routes` and `compare_routes`. The response includes `normalizedBrief`, `strategicTension`, `routes`, `personas`, `simulations`, `scores`, `premortemReview`, `comparison`, and `traceEvents`. No client-side API keys are needed or used.

### Enabling real brief normalization, tension extraction, route generation, persona building, simulation, and pre-mortem review (OpenAI)

Set both variables in Vercel:

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

With this configuration:

- `POST /api/campaign/run` runs the full eight-stage chain. LLM stages use OpenAI; `score_routes` and `compare_routes` are deterministic. After reviewing the result, the user selects a route and calls `POST /api/campaign/execution-plan` to generate the final plan.
- `POST /api/campaign/execution-plan` generates a campaign execution plan for the selected route. Called after explicit human route selection. Requires a completed run payload plus `selectedRouteId`.
- `POST /api/campaign/normalize` calls OpenAI and returns a real normalized brief (individual stage endpoint).
- `POST /api/campaign/tension` calls OpenAI and returns a real strategic tension.
- `POST /api/campaign/routes` calls OpenAI and returns 3–5 real campaign routes.
- `POST /api/campaign/personas` calls OpenAI and returns 3–6 synthetic personas. Personas are synthetic audience hypotheses for planning — not real research.
- `POST /api/campaign/simulations` calls OpenAI and returns one synthetic reaction per route/persona pair. Simulations are synthetic planning devices — not real audience research, not market validation.
- `POST /api/campaign/scores` is always deterministic — it does not call OpenAI. Returns bounded strategic estimates.
- `POST /api/campaign/premortem` calls OpenAI and returns a structured risk review. The pre-mortem is a strategic risk analysis — not market research, not a success prediction.
- `POST /api/campaign/comparison` is always deterministic — it does not call OpenAI. Returns a comparison matrix from scoring signals and premortem data.
- The Vercel build does not require the API key; only runtime LLM API calls do.

### Testing the full chain with a single call

```bash
# Run the complete eight-stage chain via the run endpoint (mock mode, no env vars needed):
curl -X POST http://localhost:3000/api/campaign/run \
  -H "Content-Type: application/json" \
  -d '{"text": "Fashion campaign for a Lisbon brand launching a new capsule for creative professionals with a low budget and Instagram-first rollout."}'
```

This returns the full `CampaignRunOutput` including normalizedBrief, strategicTension, routes, personas, simulations, scores, premortemReview, comparison, and traceEvents.

### Testing individual stages

```bash
# Step 1: Normalize a brief
curl -X POST http://localhost:3000/api/campaign/normalize \
  -H "Content-Type: application/json" \
  -d '{"text": "Fashion campaign for a Lisbon brand launching a new capsule for creative professionals with a low budget and Instagram-first rollout."}'

# Steps 2–7: Pass validated outputs through each individual stage endpoint.
# See previous API routes for tension, routes, personas, simulations, scores, premortem.

# Step 8: Compare routes (deterministic, no LLM)
curl -X POST http://localhost:3000/api/campaign/comparison \
  -H "Content-Type: application/json" \
  -d '{"routes": [ ... ], "personas": [ ... ], "simulations": [ ... ], "scores": [ ... ], "premortemReview": { ... }}'
```

All endpoints work in mock mode without any environment variables. The scores and comparison endpoints work in all modes without any env vars.

### Automated seven-stage local test (optional)

A local test script automates the full chain against a running dev server:

```bash
# Start the dev server in one terminal:
pnpm dev

# In another terminal, run the chain:
pnpm test:real-chain
```

`test:real-chain` calls each stage in sequence, prints compact summaries, and exits non-zero on any failure. It does not require committing secrets and does not run in CI. By default it targets `http://localhost:3000`; set `TEST_BASE_URL` to override.

### Vercel environment variable recommendations

**Safe public demo (no API key needed):**

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=mock
```

**Private real-provider testing:**

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Do not use `NEXT_PUBLIC_` prefix for any of these variables. They are server-side only.

## Current limitations

- **`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, `simulate_reactions`, and `premortem_review` use a real LLM provider when `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`.** `score_routes` and `compare_routes` are always deterministic.
- **`score_routes` and `compare_routes` produce bounded qualitative strategic estimates only.** Scores are in [1, 5] and are not probabilities, success predictions, or market research. They support human comparison and selection; they do not replace judgment.
- **`simulate_reactions` generates synthetic planning reactions only.** Simulations are not real audience research, do not predict real behavior, and must never be presented as market validation or conversion evidence.
- **`build_personas` generates synthetic planning hypotheses only.** Personas are not real audience research, do not predict behavior, and must not be used for discriminatory targeting.
- **`generate_campaign_routes` is strategic route generation only.** It does not use real market data or produce performance predictions. Routes are decision support, not campaign forecasts.
- **`extract_strategic_tension` is strategic interpretation only.** It does not use real market data or produce predictions.
- **Comparison is decision support, not a prediction.** The `recommendedRouteId` is a scoring-based suggestion. Human selection is required before generating an execution plan.
- **Human selection is explicit.** No execution plan is generated automatically. The user must click a route selection button and then click "Generate execution plan." The system recommendation is shown as guidance only.
- **Execution plan generation is server-side only.** `POST /api/campaign/execution-plan` accepts a completed run plus `selectedRouteId`. No client-side LLM calls. No API keys exposed to the browser.
- **Export is deterministic Markdown/HTML only.** `POST /api/campaign/export` generates a `CampaignReport` including Decision Summary, risk taxonomy, and route simulation summaries. No PDF, no LLM, no persistence.
- **No database, auth, or persistence.** Campaign runs and execution plans are held in React state only. Refreshing the page clears them.
- **No PDF export in v1.** The export artifact boundary is a placeholder.
- **No billing, no multi-tenant auth.** V1 is a demo-quality tool.

## What is and is not server-side

Server-side only (never exposed to the browser):

- `lib/env.ts` — reads `CAMPAIGN_SANDBOX_LLM_PROVIDER` and `OPENAI_API_KEY`
- `lib/llm/` — OpenAI adapter
- `lib/workflow/stages/normalize-brief.ts` — normalization stage
- `lib/workflow/stages/extract-strategic-tension.ts` — tension stage
- `lib/workflow/stages/generate-campaign-routes.ts` — route generation stage
- `lib/workflow/stages/build-personas.ts` — persona building stage
- `lib/workflow/stages/simulate-reactions.ts` — simulation stage
- `lib/workflow/stages/score-routes-stage.ts` — deterministic scoring stage
- `lib/workflow/stages/premortem-review.ts` — premortem review stage
- `lib/workflow/stages/compare-routes-stage.ts` — deterministic comparison stage
- `lib/workflow/validate-simulations.ts` — simulation coverage validator
- `lib/workflow/validate-route-scores.ts` — route score coverage validator
- `lib/workflow/validate-premortem.ts` — premortem coverage validator
- `lib/workflow/validate-comparison.ts` — comparison coverage validator
- `lib/workflow/quality/validate-route-quality.ts` — Route Quality Gate v1 (deterministic, no LLM)
- `lib/workflow/quality/validate-proof-integrity.ts` — Proof Integrity Guardrail (deterministic, no LLM)
- `lib/workflow/build-decision-summary.ts` — Decision Summary derivation (deterministic)
- `lib/workflow/derive-risk-taxonomy.ts` — Risk Taxonomy derivation (deterministic)
- `lib/workflow/derive-route-simulation-summaries.ts` — Route Simulation Summaries derivation (deterministic)
- `lib/prompts/compose-prompt.ts` — skill marker composition for prompts (server-side utility)
- `app/api/campaign/run/route.ts` — full orchestration endpoint (homepage uses this)
- `app/api/campaign/normalize/route.ts` — normalization API endpoint
- `app/api/campaign/tension/route.ts` — tension API endpoint
- `app/api/campaign/routes/route.ts` — route generation API endpoint
- `app/api/campaign/personas/route.ts` — persona building API endpoint
- `app/api/campaign/simulations/route.ts` — simulation API endpoint
- `app/api/campaign/scores/route.ts` — deterministic scoring API endpoint
- `app/api/campaign/premortem/route.ts` — premortem review API endpoint
- `app/api/campaign/comparison/route.ts` — deterministic comparison API endpoint
- `app/api/campaign/export/route.ts` — deterministic export API endpoint (no LLM)

Client-safe (no secrets):

- `lib/schemas/` — Zod schemas
- `lib/workflow/mock-campaign-run.ts` — deterministic mock data (exports used by stage mock paths)
- `lib/scoring/` — deterministic scoring and comparison helpers
- `lib/traces/` — trace event factory
- All components in `components/`

## Current limitations

- Human selection stores chosen route in React state only — no persistence across page reloads.
- No PDF export in v1. Export is Markdown/HTML only.
- No database, auth, or billing in v1.
