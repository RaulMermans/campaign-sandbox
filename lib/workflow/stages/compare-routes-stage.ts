// Server-side only. Do not import in client components or pages.
// Compares campaign routes using the deterministic comparison engine.
// SAFETY: Comparison output is a bounded qualitative decision-support matrix (1–5 per dimension).
// Scores are strategic estimates, not predictions, probabilities, or market validation.
// Human selection is required before final plan synthesis.
// No LLM calls. No environment variables. No side effects beyond the returned value.

import {
  routeComparisonMatrixSchema,
  type CampaignRoute,
  type Persona,
  type PersonaSimulation,
  type PremortemReview,
  type RouteComparisonMatrix,
  type RouteScore,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { compareRoutes } from "@/lib/scoring/compare-routes";
import { validateSimulationCoverage } from "@/lib/workflow/validate-simulations";
import { validateRouteScoreCoverage } from "@/lib/workflow/validate-route-scores";
import { validatePremortemCoverage } from "@/lib/workflow/validate-premortem";
import { validateComparisonCoverage } from "@/lib/workflow/validate-comparison";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmSchemaValidationError } from "@/lib/llm/errors";

const DEFAULT_RUN_ID = "stage-only";

export interface CompareRoutesResult {
  comparison: RouteComparisonMatrix;
  traceEvent: TraceEvent;
}

/**
 * Compare campaign routes using the deterministic comparison engine.
 *
 * SAFETY: Comparison is a bounded qualitative decision-support tool.
 * Scores (1–5) are strategic estimates, not predictions or market validation.
 * Human selection is required before generating an execution plan.
 *
 * Steps:
 * 1. Validate full route/persona simulation coverage (validateSimulationCoverage).
 * 2. Validate score coverage against routes (validateRouteScoreCoverage).
 * 3. Validate premortem coverage against routes (validatePremortemCoverage).
 * 4. Run deterministic compareRoutes.
 * 5. Validate output against routeComparisonMatrixSchema.
 * 6. Validate comparison coverage against routes (validateComparisonCoverage).
 * 7. Return { comparison, traceEvent }.
 *
 * Throws WorkflowValidationError on coverage failures.
 * Throws ZodError on schema failures.
 * Never calls OpenAI. Never reads env vars.
 */
export async function compareRoutesStage(input: {
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
  scores: RouteScore[];
  premortemReview: PremortemReview;
  runId?: string;
}): Promise<CompareRoutesResult> {
  const { routes, personas, simulations, scores, premortemReview } = input;
  const runId = input.runId ?? DEFAULT_RUN_ID;
  const startMs = Date.now();

  // Convert LlmSchemaValidationError from validateSimulationCoverage into
  // WorkflowValidationError — comparison failures are deterministic, not LLM errors.
  try {
    validateSimulationCoverage({ simulations, routes, personas });
  } catch (err) {
    if (err instanceof LlmSchemaValidationError) {
      const issues = Array.isArray(err.issues)
        ? (err.issues as Array<{ path: Array<string | number>; message: string }>)
        : [{ path: [] as Array<string | number>, message: String(err.issues) }];
      throw new WorkflowValidationError(err.message, issues);
    }
    throw err;
  }

  validateRouteScoreCoverage({ scores, routes });
  validatePremortemCoverage({ review: premortemReview, routes });

  const rawComparison = compareRoutes({ routes, simulations, scores, premortemReview });

  const comparison = routeComparisonMatrixSchema.parse(rawComparison);

  validateComparisonCoverage({ comparison, routes });

  const durationMs = Date.now() - startMs;

  const traceEvent = createTraceEvent({
    runId,
    stageId: "compare_routes",
    type: "stage.completed",
    status: "completed",
    message: "Campaign routes compared using deterministic comparison engine.",
    outputSchema: "RouteComparisonMatrix",
    provider: "deterministic",
    model: "compare-routes-v1",
    promptVersion: undefined,
    costUsd: 0,
    durationMs,
    metadata: {
      comparisonMode: "deterministic",
      routeCount: routes.length,
      recommendedRouteId: comparison.recommendedRouteId,
    },
  });

  return { comparison, traceEvent };
}
