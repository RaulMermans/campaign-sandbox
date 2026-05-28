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
- Mock normalized brief, routes, simulations, scores, and execution plan are returned.
- No OpenAI calls are made.
- No secrets are required.

### Enabling real brief normalization, tension extraction, route generation, persona building, and simulation (OpenAI)

Set both variables in Vercel:

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

With this configuration:

- `POST /api/campaign/normalize` calls OpenAI and returns a real normalized brief.
- `POST /api/campaign/tension` calls OpenAI and returns a real strategic tension (takes a normalized brief as input).
- `POST /api/campaign/routes` calls OpenAI and returns 3–5 real campaign routes (takes a normalized brief and strategic tension as input).
- `POST /api/campaign/personas` calls OpenAI and returns 3–6 synthetic personas (takes a normalized brief, strategic tension, and routes as input). Personas are synthetic audience hypotheses for planning — not real research.
- `POST /api/campaign/simulations` calls OpenAI and returns one synthetic reaction per route/persona pair (takes a normalized brief, strategic tension, routes, and personas as input). Simulations are synthetic planning devices — not real audience research, not market validation.
- `POST /api/campaign/scores` is always deterministic — it does not call OpenAI regardless of provider setting. It takes routes, personas, and simulations as input and returns bounded strategic estimates.
- The main workflow UI still uses mocked strategy outputs for all other stages.
- Only `normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, and `simulate_reactions` use the LLM — `score_routes` is deterministic and everything after it remains mocked.
- The Vercel build does not require the API key; only runtime LLM API calls do.

### Testing the six-stage path locally

```bash
# Step 1: Normalize a brief
curl -X POST http://localhost:3000/api/campaign/normalize \
  -H "Content-Type: application/json" \
  -d '{"text": "Fashion campaign for a Lisbon brand launching a new capsule for creative professionals with a low budget and Instagram-first rollout."}'

# Step 2: Copy the returned normalizedBrief and pass it to the tension route
curl -X POST http://localhost:3000/api/campaign/tension \
  -H "Content-Type: application/json" \
  -d '{"normalizedBrief": { ... paste normalizedBrief here ... }}'

# Step 3: Copy both normalizedBrief and strategicTension and pass to the routes route
curl -X POST http://localhost:3000/api/campaign/routes \
  -H "Content-Type: application/json" \
  -d '{"normalizedBrief": { ... }, "strategicTension": { ... }}'

# Step 4: Copy normalizedBrief, strategicTension, and routes array, pass to the personas route
curl -X POST http://localhost:3000/api/campaign/personas \
  -H "Content-Type: application/json" \
  -d '{"normalizedBrief": { ... }, "strategicTension": { ... }, "routes": [ ... ]}'

# Step 5: Copy normalizedBrief, strategicTension, routes, and personas, pass to the simulations route
curl -X POST http://localhost:3000/api/campaign/simulations \
  -H "Content-Type: application/json" \
  -d '{"normalizedBrief": { ... }, "strategicTension": { ... }, "routes": [ ... ], "personas": [ ... ]}'

# Step 6: Pass routes, personas, and simulations to the scores route (no LLM, no env vars needed)
curl -X POST http://localhost:3000/api/campaign/scores \
  -H "Content-Type: application/json" \
  -d '{"routes": [ ... ], "personas": [ ... ], "simulations": [ ... ]}'
```

All six routes work in mock mode without any environment variables. The scores route works in all modes without any env vars.

## Current limitations

- **Only `normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, and `simulate_reactions` can use a real LLM provider.** `score_routes` is deterministic. All stages after `score_routes` (pre-mortem, comparison, execution plan) remain mocked.
- **`score_routes` produces bounded qualitative strategic estimates only.** Scores are in [1, 5] and are not probabilities, success predictions, or market research. They support human comparison and selection.
- **`simulate_reactions` generates synthetic planning reactions only.** Simulations are not real audience research, do not predict real behavior, and must never be presented as market validation or conversion evidence. Scores are bounded qualitative estimates, not probabilities.
- **`build_personas` generates synthetic planning hypotheses only.** Personas are not real audience research, do not predict behavior, and must not be used for discriminatory targeting.
- **`generate_campaign_routes` is strategic route generation only.** It does not use real market data or produce performance predictions. Routes are decision support, not campaign forecasts.
- **`extract_strategic_tension` is strategic interpretation only.** It does not use real market data or produce predictions.
- **No database, auth, or persistence.** Campaign runs are not saved between sessions.
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
- `lib/workflow/validate-simulations.ts` — simulation coverage validator
- `lib/workflow/validate-route-scores.ts` — route score coverage validator
- `lib/workflow/stages/score-routes-stage.ts` — deterministic scoring stage
- `app/api/campaign/normalize/route.ts` — normalization API endpoint
- `app/api/campaign/tension/route.ts` — tension API endpoint
- `app/api/campaign/routes/route.ts` — route generation API endpoint
- `app/api/campaign/personas/route.ts` — persona building API endpoint
- `app/api/campaign/simulations/route.ts` — simulation API endpoint
- `app/api/campaign/scores/route.ts` — deterministic scoring API endpoint

Client-safe (no secrets):

- `lib/schemas/` — Zod schemas
- `lib/workflow/mock-campaign-run.ts` — deterministic mock data
- `lib/workflow/run-campaign-workflow.ts` — mock workflow orchestration
- `lib/scoring/` — deterministic scoring
- `lib/traces/` — trace event factory
- All components in `components/`

## Next deployment steps

The next stage to implement is `premortem_review`. It can use an LLM and should consume route scores and simulations to identify failure modes, weak assumptions, and mitigations per route — and then overall. Human selection remains required before final plan generation.
