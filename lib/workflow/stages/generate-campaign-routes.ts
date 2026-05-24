// Server-side only. Do not import in client components or pages.
// Generates campaign routes from a normalized brief and strategic tension,
// using either the mock provider or OpenAI.

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

export interface GenerateCampaignRoutesInput {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  runId?: string;
}

export interface GenerateCampaignRoutesResult {
  routes: CampaignRoute[];
  traceEvent: TraceEvent;
}

// --- Mock path ---

function generateMock(
  _input: GenerateCampaignRoutesInput,
  runId: string,
): GenerateCampaignRoutesResult {
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

  // In mock mode, validate the fixed routes so schema drift is caught immediately.
  const parsed = campaignRoutesOutputSchema.parse({ routes: MOCK_CAMPAIGN_ROUTES });
  return { routes: parsed.routes, traceEvent };
}

// --- OpenAI path ---

async function generateWithOpenAI(
  input: GenerateCampaignRoutesInput,
  runId: string,
): Promise<GenerateCampaignRoutesResult> {
  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt =
    `${promptTemplate.trim()}\n\n` +
    `## NORMALIZED BRIEF\n\n${JSON.stringify(input.normalizedBrief, null, 2)}\n\n` +
    `## STRATEGIC TENSION\n\n${JSON.stringify(input.strategicTension, null, 2)}`;

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
 * Generate campaign routes from a normalized brief and strategic tension.
 *
 * - In mock mode: returns the NODO demo routes immediately.
 * - In openai mode: loads the prompt file, calls the model, validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError) on failure.
 * Never returns unvalidated output.
 *
 * @param input - Validated normalized brief and strategic tension, plus optional runId.
 */
export async function generateCampaignRoutesStage(
  input: GenerateCampaignRoutesInput,
): Promise<GenerateCampaignRoutesResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return generateMock(input, runId);
  }
  return generateWithOpenAI(input, runId);
}
