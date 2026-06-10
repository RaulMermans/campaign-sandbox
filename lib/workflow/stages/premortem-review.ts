// Server-side only. Do not import in client components or pages.
// Runs a structured pre-mortem risk review over all campaign routes.
// SAFETY: This is a strategic risk analysis, not market research.
// Synthetic audience reactions and route scores are planning hypotheses,
// not real-world validation. This stage must never claim campaign success
// probability or present synthetic data as real customer evidence.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  premortemReviewOutputSchema,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type Persona,
  type PersonaSimulation,
  type PremortemReview,
  type RouteScore,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { validatePremortemCoverage } from "@/lib/workflow/validate-premortem";
import {
  validateProofIntegrity,
  hasBlockingProofIntegrityIssues,
} from "@/lib/workflow/quality/validate-proof-integrity";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { premortemReview as MOCK_PREMORTEM } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "premortem_review.md";
const PROMPT_VERSION = "premortem_review.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 120_000;

export interface PremortemReviewResult {
  review: PremortemReview;
  traceEvent: TraceEvent;
}

// --- Mock path ---

function premortemReviewMock(
  routes: CampaignRoute[],
  normalizedBrief: NormalizedCampaignBrief,
  runId: string,
): PremortemReviewResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "premortem_review",
    type: "stage.completed",
    status: "completed",
    message: "Pre-mortem risk review completed using mock provider.",
    outputSchema: "PremortemReview",
    provider: "mock",
    model: "mock-premortem-reviewer",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Build a review that covers every input route exactly once.
  // Use MOCK_PREMORTEM entries when the routeId matches; otherwise generate
  // a deterministic placeholder so coverage is always satisfied.
  const mockIndex = new Map<string, (typeof MOCK_PREMORTEM.routeRisks)[number]>(
    MOCK_PREMORTEM.routeRisks.map((rr) => [rr.routeId, rr]),
  );

  const routeRisks = routes.map((route) => {
    const existing = mockIndex.get(route.id);
    if (existing) return existing;
    return {
      routeId: route.id,
      risks: [
        "Concept may lack sufficient differentiation from competitors.",
        "Execution complexity could strain the available budget.",
      ],
      mitigations: [
        "Define a single ownable visual or copy element early in production.",
        "Prioritise hero assets and reduce scope before scaling.",
      ],
    };
  });

  const review: PremortemReview = {
    summary: MOCK_PREMORTEM.summary,
    routeRisks,
    overallRisks: MOCK_PREMORTEM.overallRisks,
    decisionWarnings: MOCK_PREMORTEM.decisionWarnings,
    topFailureRisks: MOCK_PREMORTEM.topFailureRisks,
  };

  // Validate mock output against schema to catch fixture drift immediately.
  const parsed = premortemReviewOutputSchema.parse({ review });
  validatePremortemCoverage({ review: parsed.review, routes });

  const proofIssues = validateProofIntegrity({ normalizedBrief, premortemReview: parsed.review });
  if (hasBlockingProofIntegrityIssues(proofIssues)) {
    throw new WorkflowValidationError(
      "Mock pre-mortem review contains unsupported customer proof language.",
      proofIssues
        .filter((i) => i.severity === "error")
        .map((i) => ({ path: [i.field], message: i.message })),
    );
  }

  return { review: parsed.review, traceEvent };
}

// --- OpenAI path ---

async function premortemReviewWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  routes: CampaignRoute[],
  personas: Persona[],
  simulations: PersonaSimulation[],
  scores: RouteScore[],
  runId: string,
): Promise<PremortemReviewResult> {
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
    "",
    "## PERSONAS",
    "",
    JSON.stringify(personas, null, 2),
    "",
    "## SIMULATIONS",
    "",
    JSON.stringify(simulations, null, 2),
    "",
    "## ROUTE SCORES",
    "",
    JSON.stringify(scores, null, 2),
  ].join("\n");

  const PROOF_REPAIR_INSTRUCTION = `
IMPORTANT CORRECTION: The previous response contained unsupported customer proof language.
Do not imply that real customer testimonials, user-generated content (UGC), customer names and photos,
satisfied subscriber quotes, or verified customer reviews exist unless the brief explicitly provides them —
including in risk descriptions and mitigation language (e.g. "mitigate by featuring real customer testimonials").
Replace any such language with:
- "testimonial-style creative" instead of "real customer testimonials"
- "scenario-based creative" instead of "user-generated content"
- "customer proof if available" or "validated testimonials if available" as qualifiers
Re-generate the full pre-mortem review JSON with this correction applied.`;

  const startMs = Date.now();
  let lastError: unknown;
  let currentPrompt = prompt;

  // One retry on JSON parse, schema validation, coverage, or proof-integrity failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt: currentPrompt,
        schema: premortemReviewOutputSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      // Cross-reference: every route must have exactly one risk review entry.
      validatePremortemCoverage({
        review: result.data.review,
        routes,
      });

      const proofIssues = validateProofIntegrity({
        normalizedBrief,
        premortemReview: result.data.review,
      });

      if (hasBlockingProofIntegrityIssues(proofIssues) && attempt === 1) {
        currentPrompt = [currentPrompt, PROOF_REPAIR_INSTRUCTION].join("\n");
        continue;
      }

      if (hasBlockingProofIntegrityIssues(proofIssues) && attempt === 2) {
        throw new WorkflowValidationError(
          "Pre-mortem review contains unsupported customer proof language after retry.",
          proofIssues
            .filter((i) => i.severity === "error")
            .map((i) => ({ path: [i.field], message: i.message })),
        );
      }

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "premortem_review",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Pre-mortem risk review completed via OpenAI."
            : "Pre-mortem risk review completed via OpenAI after one retry.",
        outputSchema: "PremortemReview",
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
 * Run a structured pre-mortem risk review for all campaign routes.
 *
 * SAFETY: This is a strategic planning tool, not market research.
 * Synthetic audience reactions and route scores are planning hypotheses only.
 * This stage must never claim real campaign success probability or present
 * synthetic data as validated customer evidence.
 *
 * - In mock mode: returns deterministic pre-mortem review immediately.
 * - In openai mode: loads the prompt file, injects all six inputs, calls the model,
 *   validates with Zod, validates route coverage, retries once on parse/schema/coverage failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError,
 * WorkflowValidationError) on failure. Never returns unvalidated output.
 *
 * @param input - Validated brief, tension, routes, personas, simulations, scores, and optional run ID.
 */
export async function premortemReviewStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
  scores: RouteScore[];
  runId?: string;
}): Promise<PremortemReviewResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return premortemReviewMock(input.routes, input.normalizedBrief, runId);
  }
  return premortemReviewWithOpenAI(
    input.normalizedBrief,
    input.strategicTension,
    input.routes,
    input.personas,
    input.simulations,
    input.scores,
    runId,
  );
}
