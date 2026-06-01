// Server-side only. Do not import in client components or pages.
// Generates 3–6 synthetic personas from a validated NormalizedCampaignBrief,
// StrategicTension, and CampaignRoutes.
// Personas are synthetic audience hypotheses for planning purposes only.
// They are not real research, do not predict behavior, and must not be used
// for discriminatory targeting.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  personasOutputSchema,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type Persona,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { campaignPersonas as MOCK_PERSONAS } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "build_personas.md";
const PROMPT_VERSION = "build_personas.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 60_000;

export interface BuildPersonasResult {
  personas: Persona[];
  traceEvent: TraceEvent;
}

// --- Mock path ---

function buildPersonasMock(runId: string): BuildPersonasResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "build_personas",
    type: "stage.completed",
    status: "completed",
    message: "Synthetic personas built using mock provider.",
    outputSchema: "Persona[]",
    provider: "mock",
    model: "mock-persona-builder",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Validate mock personas against the wrapper schema so drift is caught immediately.
  const parsed = personasOutputSchema.parse({ personas: MOCK_PERSONAS });
  return { personas: parsed.personas, traceEvent };
}

// --- OpenAI path ---

async function buildPersonasWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  routes: CampaignRoute[],
  runId: string,
): Promise<BuildPersonasResult> {
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
    "",
    "## CAMPAIGN ROUTES",
    "",
    JSON.stringify(routes, null, 2),
  ].join("\n");

  const startMs = Date.now();
  let lastError: unknown;

  // One retry on JSON parse or schema validation failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: personasOutputSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "build_personas",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Synthetic personas built via OpenAI."
            : "Synthetic personas built via OpenAI after one retry.",
        outputSchema: "Persona[]",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { personas: result.data.personas, traceEvent };
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
 * Build 3–6 synthetic personas from validated campaign inputs.
 *
 * Personas are synthetic audience hypotheses grounded in the normalized brief,
 * strategic tension, and campaign routes. They are decision-support tools,
 * not real audience research. Do not present them as real data.
 *
 * - In mock mode: returns the NODO demo personas immediately.
 * - In openai mode: loads the prompt file, injects all three inputs, calls the
 *   model, validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError)
 * on failure. Never returns unvalidated output.
 *
 * @param input - Validated normalized brief, strategic tension, routes, and optional run ID.
 */
export async function buildPersonasStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  routes: CampaignRoute[];
  runId?: string;
}): Promise<BuildPersonasResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return buildPersonasMock(runId);
  }
  return buildPersonasWithOpenAI(
    input.normalizedBrief,
    input.strategicTension,
    input.routes,
    runId,
  );
}
