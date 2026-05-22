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
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If port 3000 is already in use:

```bash
pnpm dev -- -p 3001
```

## Verification

```bash
pnpm verify
```

`pnpm verify` runs `pnpm typecheck && pnpm lint && pnpm test`.

For individual checks:

```bash
pnpm typecheck
pnpm typecheck:core
pnpm lint
pnpm test
```

## Local Troubleshooting

Use the pinned package manager from `package.json`:

```bash
corepack enable
corepack pnpm install
```

If local install or dev state looks stale, reinstall with `pnpm install` and rerun `pnpm verify`.

## What Is Mocked

V1 has no real LLM calls, API keys, database, auth, billing, or persistence. `lib/workflow/mock-campaign-run.ts` returns deterministic NODO campaign states so the UI, schemas, scoring, trace events, docs, and tests can work immediately. The default mock state awaits human route selection; the completed mock state is built only after an explicit selected route is supplied.

## Project Structure

- `app/`: Next.js routes.
- `components/`: UI, brief, route, simulation, and trace components.
- `lib/schemas/`: Zod contracts.
- `lib/workflow/`: deterministic workflow boundary and mock run.
- `lib/scoring/`: route scoring logic.
- `lib/traces/`: trace event factory.
- `prompts/`: bounded LLM prompt files.
- `workflows/`: YAML workflow contract.
- `evals/`: cases, rubrics, and fixtures.
- `docs/`: architecture and product documentation.

## Next Build Steps

- Add real bounded LLM stage execution behind the current schemas.
- Add persisted campaign runs in Supabase/Postgres.
- Add exportable artifacts.
- Add Trigger.dev orchestration when background execution is needed.
