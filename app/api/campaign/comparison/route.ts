// Server-side API route. Never import this in client components.
// Accepts validated routes, personas, simulations, scores, and premortemReview.
// Calls compareRoutesStage and returns validated comparison and traceEvent.
// SAFETY: Comparison is a decision-support tool (bounded 1–5 estimates), not a prediction.
// Human selection is required before final plan synthesis.

import { NextResponse } from "next/server";
import {
  campaignRoutesOutputSchema,
  personasOutputSchema,
  personaSimulationsOutputSchema,
  premortemReviewSchema,
  routeScoresOutputSchema,
} from "@/lib/schemas/campaign";
import { compareRoutesStage } from "@/lib/workflow/stages/compare-routes-stage";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export const runtime = "nodejs";

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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      {
        error:
          "Request body must include 'routes', 'personas', 'simulations', 'scores', and 'premortemReview' fields.",
      },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  for (const field of ["routes", "personas", "simulations", "scores"]) {
    if (!(field in bodyObj)) {
      return NextResponse.json(
        { error: `Request body must include a '${field}' field.` },
        { status: 400 },
      );
    }
  }

  if (!("premortemReview" in bodyObj) && !("review" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'premortemReview' (or 'review') field." },
      { status: 400 },
    );
  }

  // --- Validate routes ---
  const routesPayload =
    Array.isArray(bodyObj.routes) ? { routes: bodyObj.routes } : bodyObj.routes;
  const parsedRoutes = campaignRoutesOutputSchema.safeParse(routesPayload);
  if (!parsedRoutes.success) {
    return NextResponse.json(
      {
        error: "Invalid routes.",
        issues: parsedRoutes.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate personas ---
  const personasPayload =
    Array.isArray(bodyObj.personas) ? { personas: bodyObj.personas } : bodyObj.personas;
  const parsedPersonas = personasOutputSchema.safeParse(personasPayload);
  if (!parsedPersonas.success) {
    return NextResponse.json(
      {
        error: "Invalid personas.",
        issues: parsedPersonas.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate simulations ---
  const simulationsPayload =
    Array.isArray(bodyObj.simulations)
      ? { simulations: bodyObj.simulations }
      : bodyObj.simulations;
  const parsedSimulations = personaSimulationsOutputSchema.safeParse(simulationsPayload);
  if (!parsedSimulations.success) {
    return NextResponse.json(
      {
        error: "Invalid simulations.",
        issues: parsedSimulations.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate scores ---
  const scoresPayload =
    Array.isArray(bodyObj.scores) ? { scores: bodyObj.scores } : bodyObj.scores;
  const parsedScores = routeScoresOutputSchema.safeParse(scoresPayload);
  if (!parsedScores.success) {
    return NextResponse.json(
      {
        error: "Invalid scores.",
        issues: parsedScores.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate premortemReview (accept 'premortemReview' or 'review' key) ---
  const rawReview = bodyObj.premortemReview ?? bodyObj.review;
  const parsedReview = premortemReviewSchema.safeParse(rawReview);
  if (!parsedReview.success) {
    return NextResponse.json(
      {
        error: "Invalid premortemReview.",
        issues: parsedReview.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  try {
    const result = await compareRoutesStage({
      routes: parsedRoutes.data.routes,
      personas: parsedPersonas.data.personas,
      simulations: parsedSimulations.data.simulations,
      scores: parsedScores.data.scores,
      premortemReview: parsedReview.data,
      runId: "api-comparison",
    });
    return NextResponse.json({
      comparison: result.comparison,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Comparison coverage validation failed.",
          code: "WORKFLOW_VALIDATION_ERROR",
          issues: err.issues,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Comparison failed.", code: "COMPARISON_ERROR" },
      { status: 500 },
    );
  }
}
