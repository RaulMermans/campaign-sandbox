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

### Enabling real brief normalization and tension extraction (OpenAI)

Set both variables in Vercel:

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

With this configuration:

- `POST /api/campaign/normalize` calls OpenAI and returns a real normalized brief.
- `POST /api/campaign/tension` calls OpenAI and returns a real strategic tension (takes a normalized brief as input).
- The main workflow UI still uses mocked strategy outputs for all other stages.
- Only `normalize_brief` and `extract_strategic_tension` are real — everything after them remains mocked.
- The Vercel build does not require the API key; only runtime API calls do.

### Testing the two-stage real path locally

```bash
# Step 1: Normalize a brief
curl -X POST http://localhost:3000/api/campaign/normalize \
  -H "Content-Type: application/json" \
  -d '{"text": "Fashion campaign for a Lisbon brand launching a new capsule for creative professionals with a low budget and Instagram-first rollout."}'

# Step 2: Copy the returned normalizedBrief and pass it to the tension route
curl -X POST http://localhost:3000/api/campaign/tension \
  -H "Content-Type: application/json" \
  -d '{"normalizedBrief": { ... paste normalizedBrief here ... }}'
```

Both routes work in mock mode without any environment variables.

## Current limitations

- **Only `normalize_brief` and `extract_strategic_tension` can use a real LLM provider.** All subsequent stages (routes, personas, simulations, scores, pre-mortem, comparison, execution plan) remain mocked.
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
- `app/api/campaign/normalize/route.ts` — normalization API endpoint
- `app/api/campaign/tension/route.ts` — tension API endpoint

Client-safe (no secrets):

- `lib/schemas/` — Zod schemas
- `lib/workflow/mock-campaign-run.ts` — deterministic mock data
- `lib/workflow/run-campaign-workflow.ts` — mock workflow orchestration
- `lib/scoring/` — deterministic scoring
- `lib/traces/` — trace event factory
- All components in `components/`

## Next deployment steps

The next bounded LLM stage to implement is `generate_campaign_routes`, using the same pattern:

1. Server-side stage function behind the same provider adapter.
2. New API route: `app/api/campaign/routes/route.ts`.
3. Schema validation, trace event, mock fallback, tests.
4. Docs updated to reflect which stages are real.
