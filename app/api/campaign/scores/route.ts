// Server-side API route. Never import this in client components.
// Accepts validated routes, personas, and simulations.
// Calls scoreRoutesStage and returns validated route scores and traceEvent.
// SAFETY: Scores are bounded qualitative strategic estimates (1–5), not probabilities or predictions.
// They support human route comparison; they do not replace judgment.
// This route is deterministic: it does not call an LLM and does not require OPENAI_API_KEY.

import { NextResponse } from "next/server";
import {
  campaignRoutesOutputSchema,
  personasOutputSchema,
  personaSimulationsOutputSchema,
} from "@/lib/schemas/campaign";
import { scoreRoutesStage } from "@/lib/workflow/stages/score-routes-stage";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

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
          "Request body must include 'routes', 'personas', and 'simulations' fields.",
      },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Check presence of required fields ---
  if (!("routes" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'routes' field." },
      { status: 400 },
    );
  }

  if (!("personas" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'personas' field." },
      { status: 400 },
    );
  }

  if (!("simulations" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'simulations' field." },
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

  // --- Score routes ---
  try {
    const result = await scoreRoutesStage({
      routes: parsedRoutes.data.routes,
      personas: parsedPersonas.data.personas,
      simulations: parsedSimulations.data.simulations,
      runId: "api-scores",
    });
    return NextResponse.json({
      scores: result.scores,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Route scoring validation failed.",
          code: "WORKFLOW_VALIDATION_ERROR",
          issues: err.issues,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Route scoring failed.", code: "SCORING_ERROR" },
      { status: 500 },
    );
  }
}
