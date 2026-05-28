// Server-side API route. Never import this in client components.
// Accepts validated brief, tension, routes, personas, simulations, and scores.
// Calls premortemReviewStage and returns validated review and traceEvent.
// SAFETY: The premortem is a strategic risk analysis, not market research.
// Synthetic reactions and route scores are planning hypotheses only.
// This route does not claim campaign success probability or real-world certainty.

import { NextResponse } from "next/server";
import {
  campaignRoutesOutputSchema,
  normalizedCampaignBriefSchema,
  personasOutputSchema,
  personaSimulationsOutputSchema,
  routeScoresOutputSchema,
  strategicTensionSchema,
} from "@/lib/schemas/campaign";
import { premortemReviewStage } from "@/lib/workflow/stages/premortem-review";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmProviderError, LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";

// Force Node.js runtime so we can safely use fs, env, and provider SDKs.
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
      {
        error:
          "Request body must include 'normalizedBrief', 'strategicTension', 'routes', 'personas', 'simulations', and 'scores' fields.",
      },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Check presence of required fields ---
  for (const field of ["normalizedBrief", "strategicTension", "routes", "personas", "simulations", "scores"]) {
    if (!(field in bodyObj)) {
      return NextResponse.json(
        { error: `Request body must include a '${field}' field.` },
        { status: 400 },
      );
    }
  }

  // --- Validate normalizedBrief ---
  const parsedBrief = normalizedCampaignBriefSchema.safeParse(bodyObj.normalizedBrief);
  if (!parsedBrief.success) {
    return NextResponse.json(
      {
        error: "Invalid normalizedBrief.",
        issues: parsedBrief.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
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
        issues: parsedTension.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Validate routes ---
  // Accept either { routes: [...] } wrapper or a bare array for ergonomics.
  const routesPayload =
    Array.isArray(bodyObj.routes) ? { routes: bodyObj.routes } : bodyObj.routes;

  const parsedRoutes = campaignRoutesOutputSchema.safeParse(routesPayload);
  if (!parsedRoutes.success) {
    return NextResponse.json(
      {
        error: "Invalid routes.",
        issues: parsedRoutes.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Validate personas ---
  // Accept either { personas: [...] } wrapper or a bare array for ergonomics.
  const personasPayload =
    Array.isArray(bodyObj.personas)
      ? { personas: bodyObj.personas }
      : bodyObj.personas;

  const parsedPersonas = personasOutputSchema.safeParse(personasPayload);
  if (!parsedPersonas.success) {
    return NextResponse.json(
      {
        error: "Invalid personas.",
        issues: parsedPersonas.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Validate simulations ---
  // Accept either { simulations: [...] } wrapper or a bare array for ergonomics.
  const simulationsPayload =
    Array.isArray(bodyObj.simulations)
      ? { simulations: bodyObj.simulations }
      : bodyObj.simulations;

  const parsedSimulations = personaSimulationsOutputSchema.safeParse(simulationsPayload);
  if (!parsedSimulations.success) {
    return NextResponse.json(
      {
        error: "Invalid simulations.",
        issues: parsedSimulations.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Validate scores ---
  // Accept either { scores: [...] } wrapper or a bare array for ergonomics.
  const scoresPayload =
    Array.isArray(bodyObj.scores) ? { scores: bodyObj.scores } : bodyObj.scores;

  const parsedScores = routeScoresOutputSchema.safeParse(scoresPayload);
  if (!parsedScores.success) {
    return NextResponse.json(
      {
        error: "Invalid scores.",
        issues: parsedScores.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Run pre-mortem review ---
  try {
    const result = await premortemReviewStage({
      normalizedBrief: parsedBrief.data,
      strategicTension: parsedTension.data,
      routes: parsedRoutes.data.routes,
      personas: parsedPersonas.data.personas,
      simulations: parsedSimulations.data.simulations,
      scores: parsedScores.data.scores,
      runId: "api-premortem",
    });
    return NextResponse.json({
      review: result.review,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Pre-mortem coverage validation failed.",
          code: "WORKFLOW_VALIDATION_ERROR",
          issues: err.issues,
        },
        { status: 422 },
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
      { error: "Pre-mortem review failed.", code: "PREMORTEM_ERROR" },
      { status: 500 },
    );
  }
}
