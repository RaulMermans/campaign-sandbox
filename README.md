# Campaign Sandbox

Campaign Sandbox is an internal AI campaign strategy workspace built with
Next.js, TypeScript, OpenAI structured outputs, deterministic scoring, quality
gates, human route selection, local saved runs, and Markdown/HTML/PPTX export.

It turns an unstructured campaign brief into comparable strategic routes,
synthetic audience planning hypotheses, risk reviews, and an execution-ready
plan. It is a simulation and decision-support workspace for creative teams, not
an autonomous marketing agent or campaign success predictor.

## Why It Exists

Campaign development often starts with incomplete inputs and subjective route
preferences. Campaign Sandbox gives the team a repeatable structure for
distilling the brief, exploring distinct options, comparing tradeoffs, and
documenting a human decision.

## Core Workflow

```text
Messy campaign brief
-> normalized strategy brief
-> strategic tension
-> campaign routes
-> synthetic audience simulation
-> deterministic scoring + pre-mortem
-> comparison matrix
-> human route selection
-> execution-ready campaign plan
-> Markdown / HTML / PPTX export
```

Human route selection is required before final plan generation.

## Architecture

Campaign Sandbox uses a hybrid workflow-agent architecture. Deterministic code
owns orchestration, schemas, validation, scoring weights, retries, trace
logging, persistence boundaries, artifact export, and safety rules. Bounded LLM
stages handle:

- Brief normalization
- Strategic tension extraction
- Campaign route generation
- Synthetic persona building and reaction simulation
- Pre-mortem and Creative Director critique
- Final plan synthesis

The app supports deterministic mock mode and an optional server-side OpenAI
provider. API keys are never sent to the browser. Saved runs use browser
`localStorage`; there are no accounts or database users.

## Safety And Guardrails

- Synthetic audience reactions are planning hypotheses only. They are not real
  research, survey data, focus group findings, or performance predictions.
- Route scores are bounded strategic estimates, not probabilities.
- Human selection is mandatory before execution-plan generation.
- Proof-integrity checks block unsupported testimonial, validation, and outcome
  claims at generation and export boundaries.
- Final plans include assumptions, risks, channels, assets, timeline, and
  metrics.
- The deployed app fails closed behind a shared internal password gate.

## Screenshots

All screenshots use fictional demo data.

![Campaign brief intake](docs/assets/intake-screen.png)

![Decision cockpit and route comparison](docs/assets/decision-cockpit.png)

![Campaign route cards](docs/assets/route-cards.png)

![Creative Director Review](docs/assets/creative-director-review.png)

![Execution plan](docs/assets/execution-plan.png)

![Export panel](docs/assets/export-panel.png)

## Local Setup

Requirements: Node 22 and pnpm 10.

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

For local development only, set `DISABLE_INTERNAL_PASSWORD=true` to bypass the
gate. Do not use the bypass in a deployed environment.

## Environment Variables

```env
CAMPAIGN_SANDBOX_LLM_PROVIDER=mock
OPENAI_API_KEY=your_server_side_openai_key_here
OPENAI_MODEL=gpt-4.1-mini

INTERNAL_APP_PASSWORD=replace_me
DISABLE_INTERNAL_PASSWORD=false
```

- `CAMPAIGN_SANDBOX_LLM_PROVIDER`: `mock` by default; set `openai` for real
  server-side LLM stages.
- `OPENAI_API_KEY`: required only with the OpenAI provider.
- `OPENAI_MODEL`: optional model override.
- `INTERNAL_APP_PASSWORD`: required for deployed access.
- `DISABLE_INTERNAL_PASSWORD`: local development/test bypass only. Production
  ignores it even if set to `true`.

Never prefix secrets with `NEXT_PUBLIC_`.

## Password Protection

Unauthenticated page requests redirect to `/access`. Unauthorized
`/api/campaign/*` requests return `401`. A correct password sets a seven-day
`httpOnly`, `sameSite=lax` cookie that is secure in production and contains a
signed marker, never the raw password.

This is deliberately a shared internal gate. It does not add accounts, OAuth,
roles, teams, billing, or public sharing.

## Export Formats

- Markdown strategy report
- Standalone HTML strategy report
- PPTX route deck

Exports are deterministic and repeat the synthetic-data and human-selection
caveats. The export boundary blocks unsupported proof claims.

## Limitations

- Synthetic personas and reactions are not validated market research.
- Scores are not calibrated against historical campaign performance.
- PDF extraction requires selectable text and may vary by runtime; PPTX, TXT,
  or pasted text are the reliable fallbacks.
- Saved runs are browser-local and capped at 25.
- The password gate is shared access control, not user identity management.
- LLM stages run synchronously in v1.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
pnpm verify:full
```

## Project Structure

- `app/`: pages, access gate UI, and API routes
- `components/`: intake, route, simulation, decision, plan, and export UI
- `lib/schemas/`: workflow contracts
- `lib/workflow/`: deterministic orchestration, stages, and quality gates
- `lib/llm/`: server-side provider adapter and structured generation
- `lib/export/`: Markdown, HTML, and PPTX renderers
- `lib/storage/`: browser-local run library
- `prompts/`: bounded LLM prompt files
- `workflows/`: workflow definition
- `docs/`: architecture, safety, deployment, and case study

## Portfolio Case Study

Read the [repository case study](docs/case-study.md).

Portfolio page: `https://example.com/campaign-sandbox-case-study`
