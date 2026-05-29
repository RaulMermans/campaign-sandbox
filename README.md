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

## Real-provider testing

To test the full seven-stage API chain against a real OpenAI model, use the local test script:

```bash
# In one terminal:
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai OPENAI_API_KEY=sk-... pnpm dev

# In another terminal (dev server must be running):
pnpm test:real-chain
```

The script calls each stage in sequence, prints compact summaries, and exits non-zero if any stage fails. It reads env vars from the server process — no secrets are committed.

**Mock mode is the default and is always safe for demos, Vercel deployments, and CI.** No API key is required. All seven routes return valid mock data.

**Stages with real LLM support (enabled by `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai`):**
- `normalize_brief` — OpenAI
- `extract_strategic_tension` — OpenAI
- `generate_campaign_routes` — OpenAI
- `build_personas` — OpenAI
- `simulate_reactions` — OpenAI
- `premortem_review` — OpenAI

**Always deterministic (no LLM, no env vars needed):**
- `score_routes`

**Remain mocked in all configurations:**
- `compare_routes` and all later stages

**Safety reminder:** Synthetic persona reactions, route scores, and pre-mortem outputs are planning hypotheses only. They are not real audience research, market validation, or success predictions.

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

`normalize_brief`, `extract_strategic_tension`, `generate_campaign_routes`, `build_personas`, `simulate_reactions`, and `premortem_review` use the real provider. `score_routes` is always deterministic. All other stages remain mocked. See [docs/deployment.md](docs/deployment.md) for the full variable list, safety notes, and how to test all seven stages locally.

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
| `score_routes` | **Deterministic** (no LLM, no env vars needed) |
| `premortem_review` | **Real (optional)** via server-side env |
| All later stages | Mocked |

The six LLM stages require `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` and `OPENAI_API_KEY`. `score_routes` is deterministic and works in all modes without any env vars. The app builds and runs fully without any env vars (mock mode).

`score_routes` produces bounded qualitative strategic estimates (1–5) — not probabilities, not predictions. Scores support human route comparison and selection; they do not replace judgment. `premortem_review` produces a structured risk analysis — not market research, not a success prediction. Synthetic reactions and scores used in the pre-mortem are planning hypotheses only. `simulate_reactions` generates synthetic reactions for planning purposes — simulations are not real audience research, do not predict real behavior, and must never be used as market validation. `build_personas` generates synthetic audience hypotheses for planning; personas are not real research and must not be used for discriminatory targeting. `generate_campaign_routes` generates strategic options, not performance predictions.

## Project Structure

- `app/` — Next.js routes and API endpoints.
- `app/api/campaign/normalize/` — Server-side normalization API route.
- `app/api/campaign/tension/` — Server-side strategic tension API route.
- `app/api/campaign/routes/` — Server-side campaign route generation API route.
- `app/api/campaign/personas/` — Server-side persona building API route.
- `app/api/campaign/simulations/` — Server-side simulation API route.
- `app/api/campaign/scores/` — Deterministic scoring API route (no LLM).
- `app/api/campaign/premortem/` — Pre-mortem risk review API route.
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

- `compare_routes` is the next stage — it should be deterministic and use routes, simulations, scores, and premortem output to create the comparison matrix.
- Add persisted campaign runs.
- Add exportable artifacts.
- Add Trigger.dev orchestration when background execution is needed.
