# Campaign Sandbox

Campaign Sandbox is an AI-assisted creative strategy workspace for campaign simulation and decision support.

It takes a messy campaign brief, normalizes it into a strategic object, generates campaign routes, simulates synthetic audience reactions, scores tradeoffs, runs a pre-mortem, compares routes, and turns a human-selected route into an execution-ready plan.

This is not an AI campaign generator. It is a workflow for creative teams making better campaign decisions.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod
- Vitest
- pnpm

## Getting Started

Use Node 22 LTS. This repo pins pnpm in `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`. No environment variables required — the app runs in mock mode by default.

If port 3000 is already in use:

```bash
pnpm dev -- -p 3001
```

## Verification

```bash
pnpm verify        # typecheck + lint + tests
pnpm verify:full   # typecheck + lint + tests + next build
```

For individual checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Deploy to Vercel

See [docs/deployment.md](docs/deployment.md) for full instructions.

**Quick deploy (mock mode, no API keys needed):**

1. Push to GitHub.
2. Import repository in Vercel.
3. Deploy without setting any environment variables.

**Enable real brief normalization, tension extraction, route generation, persona building, and simulation:**

Set these in Vercel → Project → Settings → Environment Variables:

```
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, and `simulate_reactions` use the real provider. All later stages remain mocked. See [docs/deployment.md](docs/deployment.md) for the full variable list, safety notes, and how to test all five stages locally.

## Environment variables

Copy `.env.example` to `.env.local` and edit:

```bash
cp .env.example .env.local
```

The app builds and runs with no env vars set (defaults to mock mode). See `.env.example` for all available variables.

## Stage Status

| Stage | Status |
|---|---|
| `normalize_brief` | **Real (optional)** via server-side env |
| `extract_strategic_tension` | **Real (optional)** via server-side env |
| `generate_campaign_routes` | **Real (optional)** via server-side env |
| `build_personas` | **Real (optional)** via server-side env |
| `simulate_reactions` | **Real (optional)** via server-side env |
| All later stages | Mocked |

All five real stages require `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` and `OPENAI_API_KEY`. The app builds and runs fully without any env vars (mock mode).

`extract_strategic_tension` is strategic interpretation only — it does not use real market data or produce predictions. `generate_campaign_routes` generates strategic options for human review, not performance predictions — routes are decision support, not campaign forecasts. `build_personas` generates synthetic audience hypotheses for planning; personas are not real research, do not predict behavior, and must not be used for discriminatory targeting. `simulate_reactions` generates synthetic reactions for planning purposes — simulations are not real audience research, do not predict real behavior, and must never be used as market validation. Scores are bounded qualitative strategy scores, not probabilities. Route scores are deterministic strategic estimates.

## Project Structure

- `app/` — Next.js routes and API endpoints.
- `app/api/campaign/normalize/` — Server-side normalization API route.
- `app/api/campaign/tension/` — Server-side strategic tension API route.
- `app/api/campaign/routes/` — Server-side campaign route generation API route.
- `app/api/campaign/personas/` — Server-side persona building API route.
- `app/api/campaign/simulations/` — Server-side simulation API route.
- `components/` — UI, brief, route, simulation, and trace components.
- `lib/env.ts` — Server-side environment validation (never import in client components).
- `lib/llm/` — LLM provider adapter (server-side only).
- `lib/schemas/` — Zod contracts.
- `lib/workflow/` — Workflow boundary, mock run, and stage functions.
- `lib/workflow/stages/` — Bounded LLM stage functions (server-side only).
- `lib/scoring/` — Route scoring logic.
- `lib/traces/` — Trace event factory.
- `prompts/` — Bounded LLM prompt files.
- `workflows/` — YAML workflow contract.
- `evals/` — Cases, rubrics, and fixtures.
- `docs/` — Architecture, prompts, safety, observability, and deployment docs.

## Local Troubleshooting

Use the pinned package manager from `package.json`:

```bash
corepack enable
corepack pnpm install
```

If local install or dev state looks stale, clear generated state and reinstall:

```bash
rm -rf node_modules .next
corepack enable
pnpm install
pnpm verify
```

If port 3000 is already in use during local verification, run:

```bash
pnpm dev -- -p 3001
```

## Next Build Steps

- `score_routes` is the next deterministic API endpoint — it already has scoring logic and can be exposed as an API route consuming routes and simulations from upstream stages.
- Add persisted campaign runs.
- Add exportable artifacts.
- Add Trigger.dev orchestration when background execution is needed.
