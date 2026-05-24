// Server-side API route. Never import this in client components.
// Accepts a messy brief, validates input, calls normalizeBriefStage, returns validated output.

import { NextResponse } from "next/server";
import { rawCampaignBriefSchema } from "@/lib/schemas/campaign";
import { normalizeBriefStage } from "@/lib/workflow/stages/normalize-brief";
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

  // --- Validate input ---
  const parsed = rawCampaignBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid brief input.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // --- Normalize ---
  try {
    const result = await normalizeBriefStage(parsed.data, "api-normalize");
    return NextResponse.json({
      normalizedBrief: result.normalizedBrief,
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
    return NextResponse.json({ error: "Normalization failed." }, { status: 500 });
  }
}
