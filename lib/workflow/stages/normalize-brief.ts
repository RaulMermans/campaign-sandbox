// Server-side only. Do not import in client components or pages.
// Normalizes a messy campaign brief using either the mock provider or OpenAI.

import {
  normalizedCampaignBriefSchema,
  type NormalizedCampaignBrief,
  type RawCampaignBrief,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { normalizedBrief as MOCK_NORMALIZED_BRIEF } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "normalize_brief.md";
const PROMPT_VERSION = "normalize_brief.v1";
const DEFAULT_RUN_ID = "stage-only";

export interface NormalizeBriefResult {
  normalizedBrief: NormalizedCampaignBrief;
  traceEvent: TraceEvent;
}

// --- Mock path ---

function normalizeMock(input: RawCampaignBrief, runId: string): NormalizeBriefResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "normalize_brief",
    type: "stage.completed",
    status: "completed",
    message: "Brief normalized using mock provider.",
    outputSchema: "NormalizedCampaignBrief",
    provider: "mock",
    model: "mock-normalizer",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // In mock mode, validate the fixed brief so schema drift is caught immediately.
  const parsed = normalizedCampaignBriefSchema.parse(MOCK_NORMALIZED_BRIEF);
  void input; // mock ignores actual brief content; any valid brief returns the demo output.
  return { normalizedBrief: parsed, traceEvent };
}

// --- OpenAI path ---

async function normalizeWithOpenAI(
  input: RawCampaignBrief,
  runId: string,
): Promise<NormalizeBriefResult> {
  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt = `${promptTemplate.trim()}\n\n## MESSY BRIEF\n\n${input.text}`;

  const startMs = Date.now();
  let lastError: unknown;

  // One retry on JSON parse or schema validation failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: normalizedCampaignBriefSchema,
        model: env.openaiModel,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "normalize_brief",
        type: "stage.completed",
        status: "completed",
        message: attempt === 1
          ? "Brief normalized via OpenAI."
          : "Brief normalized via OpenAI after one retry.",
        outputSchema: "NormalizedCampaignBrief",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { normalizedBrief: result.data, traceEvent };
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
 * Normalize a messy campaign brief into a validated NormalizedCampaignBrief.
 *
 * - In mock mode: returns the NODO demo normalized brief immediately.
 * - In openai mode: loads the prompt file, calls the model, validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError) on failure.
 * Never returns unvalidated output.
 *
 * @param input - Validated raw brief input.
 * @param runId - Optional run ID to attach to the trace event.
 */
export async function normalizeBriefStage(
  input: RawCampaignBrief,
  runId = DEFAULT_RUN_ID,
): Promise<NormalizeBriefResult> {
  if (env.provider === "mock") {
    return normalizeMock(input, runId);
  }
  return normalizeWithOpenAI(input, runId);
}
