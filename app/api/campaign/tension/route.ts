// Server-side API route. Never import this in client components.
// Accepts a validated normalizedBrief, calls extractStrategicTensionStage, returns validated output.
// Does not accept raw messy briefs — this route consumes normalized objects only.

import { NextResponse } from "next/server";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { extractStrategicTensionStage } from "@/lib/workflow/stages/extract-strategic-tension";
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

  // --- Extract normalizedBrief from body ---
  if (
    typeof body !== "object" ||
    body === null ||
    !("normalizedBrief" in body)
  ) {
    return NextResponse.json(
      { error: "Request body must include a 'normalizedBrief' field." },
      { status: 400 },
    );
  }

  // --- Validate normalizedBrief ---
  const parsed = normalizedCampaignBriefSchema.safeParse(
    (body as Record<string, unknown>).normalizedBrief,
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid normalizedBrief.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Extract strategic tension ---
  try {
    const result = await extractStrategicTensionStage({
      normalizedBrief: parsed.data,
      runId: "api-tension",
    });
    return NextResponse.json({
      strategicTension: result.strategicTension,
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
    return NextResponse.json({ error: "Strategic tension extraction failed." }, { status: 500 });
  }
}
