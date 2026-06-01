// Server-side API route. Never import this in client components.
// Orchestrates the full campaign workflow from a raw brief to a comparison matrix.
// SAFETY: Synthetic audience reactions are planning hypotheses, not market research.
// Route scores and comparison are strategic estimates, not predictions.
// Human selection is required before final plan synthesis.
// No API keys, env vars, or internal errors are ever exposed in the response.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { campaignRunOutputSchema } from "@/lib/schemas/campaign";
import { normalizeBriefStage } from "@/lib/workflow/stages/normalize-brief";
import { extractStrategicTensionStage } from "@/lib/workflow/stages/extract-strategic-tension";
import { generateCampaignRoutesStage } from "@/lib/workflow/stages/generate-campaign-routes";
import { buildPersonasStage } from "@/lib/workflow/stages/build-personas";
import { simulateReactionsStage } from "@/lib/workflow/stages/simulate-reactions";
import { scoreRoutesStage } from "@/lib/workflow/stages/score-routes-stage";
import { premortemReviewStage } from "@/lib/workflow/stages/premortem-review";
import { compareRoutesStage } from "@/lib/workflow/stages/compare-routes-stage";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmProviderError, LlmJsonParseError, LlmSchemaValidationError, LlmTimeoutError } from "@/lib/llm/errors";
import { compactSimulations } from "@/lib/workflow/compact-run-context";
import type { TraceEvent } from "@/lib/schemas/trace";
import type { CampaignRoute, Persona } from "@/lib/schemas/campaign";

export const runtime = "nodejs";

type RunMode = "fast" | "deep";

// Fast-mode limits
const FAST_MAX_ROUTES = 3;
const FAST_MAX_PERSONAS = 3;


function selectFastRoutes(routes: CampaignRoute[]): CampaignRoute[] {
  if (routes.length <= FAST_MAX_ROUTES) return routes;
  const pick: CampaignRoute[] = [];
  for (const role of ["safest", "boldest", "conversion"] as const) {
    const found = routes.find((r) => r.strategicRole === role);
    if (found) pick.push(found);
  }
  return pick.slice(0, FAST_MAX_ROUTES);
}

function selectFastPersonas(personas: Persona[]): Persona[] {
  return personas.slice(0, FAST_MAX_PERSONAS);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || !("text" in (body as object))) {
    return NextResponse.json(
      { error: "Request body must include a 'text' field." },
      { status: 400 },
    );
  }

  const { text, mode } = body as Record<string, unknown>;

  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "'text' must be a string." },
      { status: 400 },
    );
  }

  if (text.trim().length < 20) {
    return NextResponse.json(
      { error: "'text' must be at least 20 characters." },
      { status: 400 },
    );
  }

  if (mode !== undefined && mode !== "fast" && mode !== "deep") {
    return NextResponse.json(
      { error: "'mode' must be 'fast' or 'deep'." },
      { status: 400 },
    );
  }

  const runMode: RunMode = mode === "deep" ? "deep" : "fast";

  const runId = randomUUID();
  const traceEvents: TraceEvent[] = [];

  try {
    // 1. Normalize brief
    const normalizeResult = await normalizeBriefStage(
      { text, source: "paste", receivedAt: new Date().toISOString() },
      runId,
    );
    traceEvents.push(normalizeResult.traceEvent);

    // 2. Extract strategic tension
    const tensionResult = await extractStrategicTensionStage({
      normalizedBrief: normalizeResult.normalizedBrief,
      runId,
    });
    traceEvents.push(tensionResult.traceEvent);

    // 3. Generate campaign routes
    const routesResult = await generateCampaignRoutesStage({
      normalizedBrief: normalizeResult.normalizedBrief,
      strategicTension: tensionResult.strategicTension,
      runId,
    });
    traceEvents.push(routesResult.traceEvent);

    // Apply fast-mode route limit
    const routes = runMode === "fast" ? selectFastRoutes(routesResult.routes) : routesResult.routes;

    // 4. Build personas
    const personasResult = await buildPersonasStage({
      normalizedBrief: normalizeResult.normalizedBrief,
      strategicTension: tensionResult.strategicTension,
      routes,
      runId,
    });
    traceEvents.push(personasResult.traceEvent);

    // Apply fast-mode persona limit
    const personas = runMode === "fast" ? selectFastPersonas(personasResult.personas) : personasResult.personas;

    // 5. Simulate reactions
    const simulationsResult = await simulateReactionsStage({
      normalizedBrief: normalizeResult.normalizedBrief,
      strategicTension: tensionResult.strategicTension,
      routes,
      personas,
      runId,
    });
    traceEvents.push(simulationsResult.traceEvent);

    // 6. Score routes (deterministic)
    const scoresResult = await scoreRoutesStage({
      routes,
      personas,
      simulations: simulationsResult.simulations,
      runId,
    });
    traceEvents.push(scoresResult.traceEvent);

    // 7. Pre-mortem review — compact simulations in fast mode to reduce prompt size
    const premortemSimulations =
      runMode === "fast"
        ? (compactSimulations(simulationsResult.simulations) as unknown as typeof simulationsResult.simulations)
        : simulationsResult.simulations;

    const premortemResult = await premortemReviewStage({
      normalizedBrief: normalizeResult.normalizedBrief,
      strategicTension: tensionResult.strategicTension,
      routes,
      personas,
      simulations: premortemSimulations,
      scores: scoresResult.scores,
      runId,
    });
    traceEvents.push(premortemResult.traceEvent);

    // 8. Compare routes (deterministic)
    const comparisonResult = await compareRoutesStage({
      routes,
      personas,
      simulations: simulationsResult.simulations,
      scores: scoresResult.scores,
      premortemReview: premortemResult.review,
      runId,
    });
    traceEvents.push(comparisonResult.traceEvent);

    const output = campaignRunOutputSchema.parse({
      runId,
      status: "completed",
      normalizedBrief: normalizeResult.normalizedBrief,
      strategicTension: tensionResult.strategicTension,
      routes,
      personas,
      simulations: simulationsResult.simulations,
      scores: scoresResult.scores,
      premortemReview: premortemResult.review,
      comparison: comparisonResult.comparison,
      traceEvents,
    });

    return NextResponse.json(output);
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Workflow validation failed.",
          code: "WORKFLOW_VALIDATION_ERROR",
          issues: err.issues,
        },
        { status: 422 },
      );
    }
    if (err instanceof LlmTimeoutError) {
      return NextResponse.json(
        { error: "LLM request timed out.", code: "LLM_TIMEOUT" },
        { status: 504 },
      );
    }
    if (err instanceof LlmProviderError) {
      return NextResponse.json(
        { error: "LLM provider error. Check provider configuration.", code: "LLM_PROVIDER_ERROR" },
        { status: 502 },
      );
    }
    if (err instanceof LlmJsonParseError) {
      return NextResponse.json(
        { error: "LLM returned invalid JSON.", code: "LLM_JSON_PARSE_ERROR" },
        { status: 502 },
      );
    }
    if (err instanceof LlmSchemaValidationError) {
      return NextResponse.json(
        { error: "LLM output did not match expected schema.", code: "LLM_SCHEMA_VALIDATION_ERROR" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Campaign run failed.", code: "RUN_ERROR" },
      { status: 500 },
    );
  }
}
