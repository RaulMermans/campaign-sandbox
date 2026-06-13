# Campaign Sandbox Case Study

## 1. Overview

Campaign Sandbox is an internal AI strategy workspace built to support creative
campaign decisions without presenting generated output as research.

An internal AI strategy workspace that turns messy campaign briefs into
structured campaign routes, synthetic audience simulations, risk reviews,
execution plans, and exportable strategy reports.

## 2. Problem

Early campaign development often mixes incomplete briefs, subjective route
preferences, scattered risk notes, and presentation work. Teams need a
repeatable way to structure those inputs while preserving human judgment.

## 3. Objective

Create a bounded internal workflow that helps a strategist move from an
unstructured brief to comparable strategic options, select a route, and leave
with an execution-ready artifact.

## 4. Product Role

The product is decision support for an internal creative team. It is not a SaaS
platform, autonomous marketing agent, market-research product, or campaign
success predictor.

## 5. Architecture Decision

The system uses a hybrid workflow-agent architecture. Deterministic TypeScript
owns orchestration, schemas, validation, scoring, retries, trace events, safety
checks, persistence boundaries, and export. Bounded LLM stages handle tasks
where generative interpretation is useful.

This keeps state transitions inspectable and prevents a free-roaming agent from
deciding what to run or when a campaign is complete.

## 6. Workflow

1. Paste or upload a fictional or approved campaign brief.
2. Normalize the brief into a structured strategy object.
3. Extract the central strategic tension.
4. Generate distinct campaign routes.
5. Build synthetic planning personas and simulate reactions.
6. Apply deterministic scoring and a pre-mortem risk review.
7. Compare routes in a decision cockpit.
8. Require explicit human route selection.
9. Generate an execution plan and export it.

## 7. Key Features

- Brief intake from pasted text, TXT, PPTX, and experimental PDF extraction.
- Structured route cards, comparison tables, and risk taxonomy.
- Synthetic audience planning hypotheses with explicit caveats.
- Deterministic score weighting and route recommendation.
- Creative Director Review and pre-mortem critique.
- Human-gated execution-plan generation.
- Browser-local saved runs with no accounts or server database.
- Markdown, HTML, and PPTX export.
- Shared password protection for deployed internal access.

## 8. Reliability and Safety Design

- Zod schemas validate workflow boundaries and structured outputs.
- LLM stages are bounded and can retry targeted quality failures once.
- Proof-integrity checks block unsupported testimonial and validation claims.
- Scores are labeled strategic estimates, not probabilities or predictions.
- Human route selection is mandatory before final plan generation.
- OpenAI calls and credentials remain server-side.
- The deployed app fails closed when its internal password is not configured.
- Trace events expose stage status without exposing prompts or secrets.

Synthetic audience reactions are planning hypotheses only. They are not real
research, survey data, focus group findings, or performance predictions.

## 9. Output Examples

The repository includes fictional demo screenshots in `docs/assets/` covering
intake, route comparison, the decision cockpit, execution planning, and export.
Generated reports repeat the synthetic-data and human-selection caveats.

## 10. Technical Stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- Zod
- OpenAI structured outputs through a server-side provider adapter
- Vitest
- JSZip and deterministic PPTX generation
- Vercel deployment

## 11. What I Learned

The most useful AI product work was not adding more autonomy. It was making
uncertainty visible, separating generated interpretation from deterministic
decision rules, and enforcing product claims at multiple boundaries.

Export quality also matters as much as generation quality. A strategy tool is
only useful when its output can move into an actual review process.

## 12. Current Limitations

- Synthetic personas do not represent real people or measured demand.
- Route scoring has no historical campaign-performance calibration.
- PDF extraction depends on selectable text and may vary by environment.
- Saved runs are browser-local and capped; there is no shared workspace.
- The password gate is shared access control, not per-user authentication.
- Long-running LLM work is synchronous in v1.

## 13. Final Status

The internal v1 workflow is implemented end to end: intake, strategy
normalization, route generation, synthetic simulation, scoring, risk review,
human selection, execution planning, local saved runs, and three export
formats. The deployed surface is protected by a shared internal password gate.
