// Server-side only. Do not import in client components or pages.
// Scores campaign routes using a deterministic scoring engine.
// SAFETY: Scores are bounded qualitative strategic estimates (1–5), not probabilities or predictions.
// They support human comparison and selection; they do not replace judgment.
// No LLM calls. No environment variables. No side effects beyond the returned value.

import {
  routeScoresOutputSchema,
  type CampaignRoute,
  type Persona,
  type PersonaSimulation,
  type RouteScore,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { validateSimulationCoverage } from "@/lib/workflow/validate-simulations";
import { validateRouteScoreCoverage } from "@/lib/workflow/validate-route-scores";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmSchemaValidationError } from "@/lib/llm/errors";

const DEFAULT_RUN_ID = "stage-only";

export interface ScoreRoutesResult {
  scores: RouteScore[];
  traceEvent: TraceEvent;
}

/**
 * Score campaign routes using the deterministic scoring engine.
 *
 * SAFETY: Scores are bounded qualitative strategic estimates (1–5).
 * They are not predictions, probabilities, or market validation.
 * They are designed to support human route comparison, not replace it.
 *
 * Steps:
 * 1. Validate full route/persona simulation coverage (validateSimulationCoverage).
 * 2. Score routes deterministically (scoreRoutes).
 * 3. Validate output against routeScoresOutputSchema.
 * 4. Validate score coverage against routes (validateRouteScoreCoverage).
 * 5. Return { scores, traceEvent }.
 *
 * Throws WorkflowValidationError on coverage failures.
 * Throws ZodError on schema failures.
 * Never calls OpenAI. Never reads env vars.
 */
export async function scoreRoutesStage(input: {
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
  runId?: string;
}): Promise<ScoreRoutesResult> {
  const { routes, personas, simulations } = input;
  const runId = input.runId ?? DEFAULT_RUN_ID;
  const startMs = Date.now();

  // Convert LlmSchemaValidationError from validateSimulationCoverage into
  // WorkflowValidationError — scoring failures are deterministic, not LLM errors.
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

  const rawScores = scoreRoutes(routes, simulations);

  const parsed = routeScoresOutputSchema.parse({ scores: rawScores });

  validateRouteScoreCoverage({ scores: parsed.scores, routes });

  const durationMs = Date.now() - startMs;

  const traceEvent = createTraceEvent({
    runId,
    stageId: "score_routes",
    type: "stage.completed",
    status: "completed",
    message: "Campaign routes scored using deterministic scoring engine.",
    outputSchema: "RouteScore[]",
    provider: "deterministic",
    model: "score-routes-v1",
    promptVersion: undefined,
    costUsd: 0,
    durationMs,
    metadata: {
      scoringMode: "deterministic",
      routeCount: routes.length,
      simulationCount: simulations.length,
    },
  });

  return { scores: parsed.scores, traceEvent };
}
