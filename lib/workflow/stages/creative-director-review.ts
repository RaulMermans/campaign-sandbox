// Server-side only. Do not import in client components or pages.
// Runs a bounded creative-director critique stage over generated campaign routes.
// SAFETY: This is expert creative critique, not market research or audience validation.
// It must never claim audience proof, survey data, or real-world performance evidence.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  creativeDirectorReviewOutputSchema,
  type CampaignRoute,
  type CreativeDirectorReview,
  type NormalizedCampaignBrief,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { validateCreativeDirectorReviewCoverage } from "@/lib/workflow/validate-creative-director-review";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { buildMockCreativeDirectorReview } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "creative_director_review.md";
const PROMPT_VERSION = "creative_director_review.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 120_000;

export interface CreativeDirectorReviewResult {
  review: CreativeDirectorReview;
  traceEvent: TraceEvent;
}

// --- Mock path ---

function creativeDirectorReviewMock(
  routes: CampaignRoute[],
  runId: string,
): CreativeDirectorReviewResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "creative_director_review",
    type: "stage.completed",
    status: "completed",
    message: "Creative director review completed using mock provider.",
    outputSchema: "CreativeDirectorReview",
    provider: "mock",
    model: "mock-creative-director",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  const review = buildMockCreativeDirectorReview(routes);

  // Validate mock output against schema and coverage to catch fixture drift immediately.
  const parsed = creativeDirectorReviewOutputSchema.parse({ review });
  validateCreativeDirectorReviewCoverage({ review: parsed.review, routes });

  return { review: parsed.review, traceEvent };
}

// --- OpenAI path ---

async function creativeDirectorReviewWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  routes: CampaignRoute[],
  runId: string,
): Promise<CreativeDirectorReviewResult> {
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

  // One retry on JSON parse, schema validation, or coverage failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: creativeDirectorReviewOutputSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      // Cross-reference: every route must have exactly one creative director review entry.
      validateCreativeDirectorReviewCoverage({
        review: result.data.review,
        routes,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "creative_director_review",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Creative director review completed via OpenAI."
            : "Creative director review completed via OpenAI after one retry.",
        outputSchema: "CreativeDirectorReview",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { review: result.data.review, traceEvent };
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof LlmJsonParseError ||
        err instanceof LlmSchemaValidationError ||
        err instanceof WorkflowValidationError;
      if (!isRetryable || attempt === 2) {
        break;
      }
      // Retry once on JSON, schema, or coverage failure; do not retry on provider/network errors.
    }
  }

  throw lastError;
}

// --- Public API ---

/**
 * Run a bounded creative-director critique over all campaign routes.
 *
 * SAFETY: This is expert creative critique, not market research or audience
 * validation. It must never claim audience proof, survey evidence, or
 * real-world performance data — only direct creative judgment and sharper
 * alternatives the team can act on.
 *
 * - In mock mode: returns a deterministic review immediately.
 * - In openai mode: loads the prompt file, injects brief/tension/routes, calls the model,
 *   validates with Zod, validates route coverage, retries once on parse/schema/coverage failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError,
 * WorkflowValidationError) on failure. Never returns unvalidated output.
 *
 * @param input - Validated brief, tension, routes, and optional run ID.
 */
export async function creativeDirectorReviewStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  routes: CampaignRoute[];
  runId?: string;
}): Promise<CreativeDirectorReviewResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return creativeDirectorReviewMock(input.routes, runId);
  }
  return creativeDirectorReviewWithOpenAI(
    input.normalizedBrief,
    input.strategicTension,
    input.routes,
    runId,
  );
}
