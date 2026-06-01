// Server-side API route. Never import this in client components.
// Accepts validated normalizedBrief, strategicTension, routes, and personas.
// Calls simulateReactionsStage and returns validated simulations and traceEvent.
// Does not accept raw messy briefs — this route consumes validated strategic inputs only.
// SAFETY: Simulations returned are synthetic planning devices, not real audience research.
// They do not predict real behavior and must never be used as market validation.

import { NextResponse } from "next/server";
import {
  normalizedCampaignBriefSchema,
  strategicTensionSchema,
  campaignRoutesOutputSchema,
  personasOutputSchema,
} from "@/lib/schemas/campaign";
import { simulateReactionsStage } from "@/lib/workflow/stages/simulate-reactions";
import { LlmJsonParseError, LlmProviderError, LlmSchemaValidationError, LlmTimeoutError } from "@/lib/llm/errors";

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
          "Request body must include 'normalizedBrief', 'strategicTension', 'routes', and 'personas' fields.",
      },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Check presence of required fields ---
  if (!("normalizedBrief" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'normalizedBrief' field." },
      { status: 400 },
    );
  }

  if (!("strategicTension" in bodyObj)) {
    return NextResponse.json(
      { error: "Request body must include a 'strategicTension' field." },
      { status: 400 },
    );
  }

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

  // --- Simulate reactions ---
  try {
    const result = await simulateReactionsStage({
      normalizedBrief: parsedBrief.data,
      strategicTension: parsedTension.data,
      routes: parsedRoutes.data.routes,
      personas: parsedPersonas.data.personas,
      runId: "api-simulations",
    });
    return NextResponse.json({
      simulations: result.simulations,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof LlmTimeoutError) {
      return NextResponse.json(
        { error: "LLM request timed out.", code: "LLM_TIMEOUT" },
        { status: 504 },
      );
    }
    if (err instanceof LlmJsonParseError) {
      return NextResponse.json(
        { error: "LLM stage failed.", code: "LLM_JSON_PARSE_ERROR" },
        { status: 500 },
      );
    }
    if (err instanceof LlmSchemaValidationError) {
      return NextResponse.json(
        { error: "LLM stage failed.", code: "LLM_SCHEMA_VALIDATION_ERROR" },
        { status: 500 },
      );
    }
    if (err instanceof LlmProviderError) {
      return NextResponse.json(
        { error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" },
      { status: 500 },
    );
  }
}
