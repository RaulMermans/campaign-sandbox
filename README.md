# Campaign Sandbox

Campaign Sandbox is an AI-assisted creative strategy workspace for campaign simulation and decision support.

It takes a messy campaign brief (pasted, or imported from a PDF/PPTX/TXT file), normalizes it into a strategic object, generates campaign routes, simulates synthetic audience reactions, scores tradeoffs, runs a pre-mortem, compares routes, and turns a human-selected route into an execution-ready plan.

This is not an AI campaign generator. It is a workflow for creative teams making better campaign decisions.

## What's new in v1

- **Intake Mode / Results Workspace Mode** — the UI now switches layouts. Before a run: editorial two-column intake with paste/upload support. After a run: compact top bar + full-width results workspace with sticky section nav and a brief drawer for re-running.
- **File brief import** — upload a PDF, PPTX, or TXT file. Text is extracted server-side, shown in an editable preview, and only sent to the LLM when you click Run. No file storage, no OCR, no auto-run.
- **Skill layer v2** — `<!-- skill:name -->` marker replacement at runtime via `composePrompt()`. Skills are bounded prompt instructions, not autonomous agents.
- **Decision Cockpit** — deterministic summary after run completion: recommended route, why it wins, runner-up, tradeoff, typed risk badge, close-score notice.
- **Route Quality Gate v1** — deterministic validator after route generation. Flags generic names, vague killer lines, thin visual worlds, unsupported proof claims. Retries once with a focused repair prompt on blocking issues.
- **Proof Integrity Guardrail** — flags "real customer testimonials" and similar unsupported claims in routes and execution plan unless the brief provides evidence.
- **Risk Taxonomy** — six typed risk categories (Creative / Proof / Conversion / Channel / Execution / Brand dilution) derived deterministically per route.
- **Route Simulation Summaries** — derived averages + strongest/weakest persona per route, shown before individual persona cards.
- **Export v2** — Markdown and HTML reports now include Decision Summary, risk taxonomy, and route simulation synthesis tables.

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

## How it works

The homepage calls `POST /api/campaign/run` with the user's pasted brief. The server orchestrates all eight implemented stages:

1. `normalize_brief` — LLM (mock or OpenAI)
2. `extract_strategic_tension` — LLM (mock or OpenAI)
3. `generate_campaign_routes` — LLM (mock or OpenAI)
4. `build_personas` — LLM (mock or OpenAI)
5. `simulate_reactions` — LLM (mock or OpenAI)
6. `score_routes` — deterministic
7. `premortem_review` — LLM (mock or OpenAI)
8. `compare_routes` — deterministic

The response includes all stage outputs and a trace event list. No client-side API keys. No env vars exposed to the browser.

The run endpoint accepts an optional `mode` parameter: `"fast"` (default) or `"deep"`. Fast mode limits to 3 routes and 3 personas (max 9 simulations) for lower latency. Deep mode preserves all generated routes and personas. All stages run in both modes.

## Real-provider testing

To test the full eight-stage chain against a real OpenAI model:

```bash
# In one terminal:
CAMPAIGN_SANDBOX_LLM_PROVIDER=openai OPENAI_API_KEY=sk-... pnpm dev

# In another terminal (dev server must be running):
pnpm test:real-chain
```

**Mock mode is the default and is always safe for demos, Vercel deployments, and CI.** No API key is required.

**Safety reminder:** Synthetic persona reactions, route scores, pre-mortem outputs, and comparison matrices are planning hypotheses only. They are not real audience research, market validation, or success predictions. Comparison is decision support — human selection is required before generating an execution plan.

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
| `compare_routes` | **Deterministic** (no LLM, no env vars needed) |
| `human_selection` | Local explicit user action (UI only, no persistence) |
| `generate_execution_plan` | **Real (optional)** via server-side env — requires explicit human route selection |
| `export_artifact` | **Deterministic** Markdown/HTML (no LLM, no PDF, no persistence) |

LLM stages require `CAMPAIGN_SANDBOX_LLM_PROVIDER=openai` and `OPENAI_API_KEY`. Deterministic stages (`score_routes`, `compare_routes`) work in all modes without any env vars. The app builds and runs fully without any env vars (mock mode).

All scores and comparison dimensions are bounded qualitative strategic estimates (1–5) — not probabilities, not predictions. Synthetic persona reactions are planning hypotheses only — not real audience research or market validation. Comparison is decision support; human selection is required before generating an execution plan.

## Project Structure

- `app/` — Next.js routes and API endpoints.
- `app/api/campaign/run/` — **Full orchestration endpoint** (homepage calls this).
- `app/api/campaign/normalize/` — Server-side normalization API route.
- `app/api/campaign/tension/` — Server-side strategic tension API route.
- `app/api/campaign/routes/` — Server-side campaign route generation API route.
- `app/api/campaign/personas/` — Server-side persona building API route.
- `app/api/campaign/simulations/` — Server-side simulation API route.
- `app/api/campaign/scores/` — Deterministic scoring API route (no LLM).
- `app/api/campaign/premortem/` — Pre-mortem risk review API route.
- `app/api/campaign/comparison/` — Deterministic comparison API route (no LLM).
- `app/api/campaign/extract-brief/` — File extraction API (PDF/PPTX/TXT). No file storage, no LLM.
- `components/` — UI, brief, route, simulation, trace, intake, and layout components.
- `components/intake/` — Intake Mode components: brief intake panel, file upload panel, extracted brief preview.
- `components/layout/` — App shell (Intake/Results mode switcher), results workspace, brief drawer.
- `lib/env.ts` — Server-side environment validation (never import in client components).
- `lib/extract/` — Server-side brief extraction utilities (txt, pdf, pptx, validation).
- `lib/llm/` — LLM provider adapter (server-side only).
- `lib/schemas/` — Zod contracts.
- `lib/skills/` — Prompt-injection skill modules (`.md` files + TypeScript loader). Not autonomous agents.
- `lib/workflow/` — Workflow boundary, mock run, validators, stage functions, and deterministic derivations.
- `lib/workflow/stages/` — Bounded stage functions (server-side only).
- `lib/workflow/quality/` — Route Quality Gate and Proof Integrity Guardrail (deterministic validators).
- `lib/scoring/` — Deterministic route scoring and comparison helpers.
- `lib/traces/` — Trace event factory.
- `lib/export/` — Deterministic export renderers (Markdown, HTML).
- `lib/prompts/` — `composePrompt()` skill-marker replacement utility.
- `prompts/` — Bounded LLM prompt files (include injected skill sections).
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

- Add persisted campaign runs.
- Add PDF export option.
- Add Trigger.dev orchestration when background execution is needed.
