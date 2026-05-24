// Server-side API route. Never import this in client components.
// Accepts validated normalizedBrief and strategicTension, generates campaign routes.
// Does NOT accept raw messy briefs — inputs must already be validated structured objects.

import { NextResponse } from "next/server";
import {
  normalizedCampaignBriefSchema,
  strategicTensionSchema,
} from "@/lib/schemas/campaign";
import { generateCampaignRoutesStage } from "@/lib/workflow/stages/generate-campaign-routes";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";

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

  // --- Validate structure ---
  const bodyObj = body as Record<string, unknown> | null;
  if (!bodyObj || typeof bodyObj !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  if (!("normalizedBrief" in bodyObj)) {
    return NextResponse.json(
      { error: "Missing required field: normalizedBrief." },
      { status: 400 },
    );
  }

  if (!("strategicTension" in bodyObj)) {
    return NextResponse.json(
      { error: "Missing required field: strategicTension." },
      { status: 400 },
    );
  }

  // --- Validate normalizedBrief ---
  const briefParsed = normalizedCampaignBriefSchema.safeParse(bodyObj.normalizedBrief);
  if (!briefParsed.success) {
    return NextResponse.json(
      {
        error: "Invalid normalizedBrief input.",
        issues: briefParsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Validate strategicTension ---
  const tensionParsed = strategicTensionSchema.safeParse(bodyObj.strategicTension);
  if (!tensionParsed.success) {
    return NextResponse.json(
      {
        error: "Invalid strategicTension input.",
        issues: tensionParsed.error.issues.map((issue) => ({
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
      normalizedBrief: briefParsed.data,
      strategicTension: tensionParsed.data,
      runId: "api-routes",
    });
    return NextResponse.json({
      routes: result.routes,
      traceEvent: result.traceEvent,
    });
  } catch (err) {
    // Sanitize: never return raw provider response text, model output, API keys,
    // stack traces, or provider internals. Map to safe public error shapes only.
    if (err instanceof LlmProviderError) {
      return NextResponse.json(
        { error: "LLM stage failed.", code: "LLM_PROVIDER_ERROR" },
        { status: 500 },
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
    return NextResponse.json({ error: "Campaign route generation failed." }, { status: 500 });
  }
}
