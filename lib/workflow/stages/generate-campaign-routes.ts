// Server-side only. Do not import in client components or pages.
// Generates 3–5 campaign routes from a validated NormalizedCampaignBrief and StrategicTension.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  campaignRoutesOutputSchema,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { campaignRoutes as MOCK_CAMPAIGN_ROUTES } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "generate_campaign_routes.md";
const PROMPT_VERSION = "generate_campaign_routes.v1";
const DEFAULT_RUN_ID = "stage-only";

export interface GenerateCampaignRoutesResult {
  routes: CampaignRoute[];
  traceEvent: TraceEvent;
}

// --- Mock path ---

function generateRoutesMock(runId: string): GenerateCampaignRoutesResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "generate_campaign_routes",
    type: "stage.completed",
    status: "completed",
    message: "Campaign routes generated using mock provider.",
    outputSchema: "CampaignRoute[]",
    provider: "mock",
    model: "mock-route-generator",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Validate the fixed mock against the wrapper schema so drift is caught immediately.
  const parsed = campaignRoutesOutputSchema.parse({ routes: MOCK_CAMPAIGN_ROUTES });
  return { routes: parsed.routes, traceEvent };
}

// --- OpenAI path ---

async function generateRoutesWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  runId: string,
): Promise<GenerateCampaignRoutesResult> {
  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt = [
    promptTemplate.trim(),
    "",
    "## NORMALIZED BRIEF",
    "",
    JSON.stringify(normalizedBrief, null, 2),
    "",
    "## STRATEGIC TENSION",
    "",
    JSON.stringify(strategicTension, null, 2),
  ].join("\n");

  const startMs = Date.now();
  let lastError: unknown;

  // One retry on JSON parse or schema validation failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: campaignRoutesOutputSchema,
        model: env.openaiModel,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "generate_campaign_routes",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Campaign routes generated via OpenAI."
            : "Campaign routes generated via OpenAI after one retry.",
        outputSchema: "CampaignRoute[]",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { routes: result.data.routes, traceEvent };
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof LlmJsonParseError || err instanceof LlmSchemaValidationError;
      if (!isRetryable || attempt === 2) {
        break;
      }
      // Retry once on JSON or schema failure; do not retry on provider/network errors.
    }
  }

  throw lastError;
}

// --- Public API ---

/**
 * Generate 3–5 campaign routes from a validated NormalizedCampaignBrief and StrategicTension.
 *
 * - In mock mode: returns the NODO demo routes immediately.
 * - In openai mode: loads the prompt file, injects both inputs, calls the model,
 *   validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError) on failure.
 * Never returns unvalidated output.
 *
 * @param input - Validated normalized brief, strategic tension, and optional run ID.
 */
export async function generateCampaignRoutesStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  runId?: string;
}): Promise<GenerateCampaignRoutesResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return generateRoutesMock(runId);
  }
  return generateRoutesWithOpenAI(input.normalizedBrief, input.strategicTension, runId);
}
