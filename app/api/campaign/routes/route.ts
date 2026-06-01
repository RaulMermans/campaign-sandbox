// Server-side API route. Never import this in client components.
// Accepts validated normalizedBrief and strategicTension, calls generateCampaignRoutesStage,
// returns validated routes and traceEvent.
// Does not accept raw messy briefs — this route consumes validated strategic inputs only.

import { NextResponse } from "next/server";
import { normalizedCampaignBriefSchema, strategicTensionSchema } from "@/lib/schemas/campaign";
import { generateCampaignRoutesStage } from "@/lib/workflow/stages/generate-campaign-routes";
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
      { error: "Request body must include 'normalizedBrief' and 'strategicTension' fields." },
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

  // --- Generate routes ---
  try {
    const result = await generateCampaignRoutesStage({
      normalizedBrief: parsedBrief.data,
      strategicTension: parsedTension.data,
      runId: "api-routes",
    });
    return NextResponse.json({
      routes: result.routes,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    if (err instanceof LlmTimeoutError) {
      return NextResponse.json({ error: "LLM request timed out.", code: "LLM_TIMEOUT" }, { status: 504 });
    }
    if (err instanceof LlmJsonParseError) {
      return NextResponse.json({ error: "LLM stage failed.", code: "LLM_JSON_PARSE_ERROR" }, { status: 500 });
    }
    if (err instanceof LlmSchemaValidationError) {
      return NextResponse.json({ error: "LLM stage failed.", code: "LLM_SCHEMA_VALIDATION_ERROR" }, { status: 500 });
    }
    if (err instanceof LlmProviderError) {
      return NextResponse.json({ error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" }, { status: 500 });
    }
    return NextResponse.json({ error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" }, { status: 500 });
  }
}
