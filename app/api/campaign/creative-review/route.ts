// Server-side API route. Never import this in client components.
// Accepts validated brief, tension, and routes.
// Calls creativeDirectorReviewStage and returns validated review and traceEvent.
// SAFETY: This is expert creative critique, not market research or audience validation.
// It must never claim audience proof, survey data, or real-world performance evidence.

import { NextResponse } from "next/server";
import {
  campaignRoutesOutputSchema,
  normalizedCampaignBriefSchema,
  strategicTensionSchema,
} from "@/lib/schemas/campaign";
import { creativeDirectorReviewStage } from "@/lib/workflow/stages/creative-director-review";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmProviderError, LlmJsonParseError, LlmSchemaValidationError, LlmTimeoutError } from "@/lib/llm/errors";

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
        error: "Request body must include 'normalizedBrief', 'strategicTension', and 'routes' fields.",
      },
      { status: 400 },
    );
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Check presence of required fields ---
  for (const field of ["normalizedBrief", "strategicTension", "routes"]) {
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

  // --- Run creative director review ---
  try {
    const result = await creativeDirectorReviewStage({
      normalizedBrief: parsedBrief.data,
      strategicTension: parsedTension.data,
      routes: parsedRoutes.data.routes,
      runId: "api-creative-review",
    });
    return NextResponse.json({
      review: result.review,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return NextResponse.json(
        {
          error: "Creative director review coverage validation failed.",
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
      { error: "Creative director review failed.", code: "CREATIVE_DIRECTOR_REVIEW_ERROR" },
      { status: 500 },
    );
  }
}
