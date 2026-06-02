// Server-side API route. Never import this in client components.
// Accepts a completed campaign run plus an explicit human route selection.
// Calls generateExecutionPlanStage and returns a validated execution plan and traceEvent.
// SAFETY: The execution plan is a strategic planning document, not market research.
// Synthetic reactions are planning hypotheses only. No success probabilities.

import { NextResponse } from "next/server";
import {
  campaignRoutesOutputSchema,
  humanSelectionSchema,
  normalizedCampaignBriefSchema,
  personasOutputSchema,
  personaSimulationsOutputSchema,
  premortemReviewOutputSchema,
  routeComparisonMatrixSchema,
  routeScoresOutputSchema,
  strategicTensionSchema,
} from "@/lib/schemas/campaign";
import { generateExecutionPlanStage } from "@/lib/workflow/stages/generate-execution-plan";
import { validateSelectedRoute } from "@/lib/workflow/validate-selection";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmProviderError, LlmJsonParseError, LlmSchemaValidationError, LlmTimeoutError } from "@/lib/llm/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // --- Parse body ---
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
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Check required fields ---
  const requiredFields = [
    "selectedRouteId",
    "normalizedBrief",
    "strategicTension",
    "routes",
    "personas",
    "simulations",
    "scores",
    "premortemReview",
    "comparison",
  ] as const;

  for (const field of requiredFields) {
    if (!(field in bodyObj)) {
      return NextResponse.json(
        { error: `Request body must include a '${field}' field.` },
        { status: 400 },
      );
    }
  }

  // --- Validate selectedRouteId ---
  const parsedSelection = humanSelectionSchema.safeParse({
    selectedRouteId: bodyObj.selectedRouteId,
  });
  if (!parsedSelection.success) {
    return NextResponse.json(
      {
        error: "Invalid selectedRouteId.",
        issues: parsedSelection.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate normalizedBrief ---
  const parsedBrief = normalizedCampaignBriefSchema.safeParse(bodyObj.normalizedBrief);
  if (!parsedBrief.success) {
    return NextResponse.json(
      {
        error: "Invalid normalizedBrief.",
        issues: parsedBrief.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate strategicTension ---
  const parsedTension = strategicTensionSchema.safeParse(bodyObj.strategicTension);
  if (!parsedTension.success) {
    return NextResponse.json(
      {
        error: "Invalid strategicTension.",
        issues: parsedTension.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate routes (bare array or wrapped) ---
  const routesPayload = Array.isArray(bodyObj.routes) ? { routes: bodyObj.routes } : bodyObj.routes;
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

  // --- Validate personas (bare array or wrapped) ---
  const personasPayload = Array.isArray(bodyObj.personas) ? { personas: bodyObj.personas } : bodyObj.personas;
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

  // --- Validate simulations (bare array or wrapped) ---
  const simulationsPayload = Array.isArray(bodyObj.simulations)
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

  // --- Validate scores (bare array or wrapped) ---
  const scoresPayload = Array.isArray(bodyObj.scores) ? { scores: bodyObj.scores } : bodyObj.scores;
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

  // --- Validate premortemReview (bare or wrapped) ---
  const premortemPayload =
    bodyObj.premortemReview && typeof bodyObj.premortemReview === "object" && "review" in (bodyObj.premortemReview as Record<string, unknown>)
      ? (bodyObj.premortemReview as { review: unknown }).review
      : bodyObj.premortemReview;
  const parsedPremortem = premortemReviewOutputSchema.safeParse({ review: premortemPayload });
  if (!parsedPremortem.success) {
    return NextResponse.json(
      {
        error: "Invalid premortemReview.",
        issues: parsedPremortem.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate comparison ---
  const parsedComparison = routeComparisonMatrixSchema.safeParse(bodyObj.comparison);
  if (!parsedComparison.success) {
    return NextResponse.json(
      {
        error: "Invalid comparison.",
        issues: parsedComparison.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  }

  // --- Validate selectedRouteId exists in routes ---
  try {
    validateSelectedRoute({
      selectedRouteId: parsedSelection.data.selectedRouteId,
      routes: parsedRoutes.data.routes,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Selected route not found in provided routes.",
          code: "INVALID_SELECTED_ROUTE",
          issues: err.issues,
        },
        { status: 422 },
      );
    }
    throw err;
  }

  // --- Generate execution plan ---
  const runId = typeof bodyObj.runId === "string" ? bodyObj.runId : "api-execution-plan";

  try {
    const result = await generateExecutionPlanStage({
      normalizedBrief: parsedBrief.data,
      strategicTension: parsedTension.data,
      routes: parsedRoutes.data.routes,
      personas: parsedPersonas.data.personas,
      simulations: parsedSimulations.data.simulations,
      scores: parsedScores.data.scores,
      premortemReview: parsedPremortem.data.review,
      comparison: parsedComparison.data,
      selectedRouteId: parsedSelection.data.selectedRouteId,
      runId,
    });

    return NextResponse.json({
      executionPlan: result.executionPlan,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Route selection validation failed.",
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
      { error: "Execution plan generation failed.", code: "EXECUTION_PLAN_ERROR" },
      { status: 500 },
    );
  }
}
