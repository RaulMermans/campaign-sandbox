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

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm lint
```

## What Is Mocked

V1 has no real LLM calls, API keys, database, auth, billing, or persistence. `lib/workflow/mock-campaign-run.ts` returns a deterministic NODO campaign run so the UI, schemas, scoring, trace events, docs, and tests can work immediately.

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
- Add human route selection UI state.
- Add exportable artifacts.
- Add Trigger.dev orchestration when background execution is needed.
