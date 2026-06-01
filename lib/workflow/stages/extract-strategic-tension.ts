// Server-side only. Do not import in client components or pages.
// Extracts strategic tension from a validated NormalizedCampaignBrief using either the mock provider or OpenAI.

import {
  strategicTensionSchema,
  type NormalizedCampaignBrief,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { strategicTension as MOCK_STRATEGIC_TENSION } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "extract_strategic_tension.md";
const PROMPT_VERSION = "extract_strategic_tension.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 45_000;

export interface ExtractStrategicTensionResult {
  strategicTension: StrategicTension;
  traceEvent: TraceEvent;
}

// --- Mock path ---

function extractTensionMock(runId: string): ExtractStrategicTensionResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "extract_strategic_tension",
    type: "stage.completed",
    status: "completed",
    message: "Strategic tension extracted using mock provider.",
    outputSchema: "StrategicTension",
    provider: "mock",
    model: "mock-strategic-tension",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Validate the fixed mock so schema drift is caught immediately.
  const parsed = strategicTensionSchema.parse(MOCK_STRATEGIC_TENSION);
  return { strategicTension: parsed, traceEvent };
}

// --- OpenAI path ---

async function extractTensionWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  runId: string,
): Promise<ExtractStrategicTensionResult> {
  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt = `${promptTemplate.trim()}\n\n## NORMALIZED BRIEF\n\n${JSON.stringify(normalizedBrief, null, 2)}`;

  const startMs = Date.now();
  let lastError: unknown;

  // One retry on JSON parse or schema validation failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: strategicTensionSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "extract_strategic_tension",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Strategic tension extracted via OpenAI."
            : "Strategic tension extracted via OpenAI after one retry.",
        outputSchema: "StrategicTension",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { strategicTension: result.data, traceEvent };
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
 * Extract strategic tension from a validated NormalizedCampaignBrief.
 *
 * - In mock mode: returns the NODO demo strategic tension immediately.
 * - In openai mode: loads the prompt file, calls the model, validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError) on failure.
 * Never returns unvalidated output.
 *
 * @param input - Validated normalized brief and optional run ID.
 */
export async function extractStrategicTensionStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  runId?: string;
}): Promise<ExtractStrategicTensionResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return extractTensionMock(runId);
  }
  return extractTensionWithOpenAI(input.normalizedBrief, runId);
}
