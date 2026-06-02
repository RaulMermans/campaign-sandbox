// Server-side only. Do not import in client components or pages.
// Generates a practical campaign execution plan for the human-selected route.
// SAFETY: The execution plan is a strategic planning document, not market research.
// Synthetic audience reactions are hypotheses used for planning only.
// This stage must never claim campaign success probability or present synthetic
// reactions as validated customer evidence.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  campaignExecutionPlanOutputSchema,
  type CampaignExecutionPlan,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type Persona,
  type PersonaSimulation,
  type PremortemReview,
  type RouteComparisonMatrix,
  type RouteScore,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { validateSelectedRoute } from "@/lib/workflow/validate-selection";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { buildMockCompletedCampaignRun } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "generate_execution_plan.md";
const PROMPT_VERSION = "generate_execution_plan.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 120_000;

export interface GenerateExecutionPlanResult {
  executionPlan: CampaignExecutionPlan;
  traceEvent: TraceEvent;
}

// --- Mock path ---

function generateExecutionPlanMock(
  routes: CampaignRoute[],
  selectedRouteId: string,
  runId: string,
): GenerateExecutionPlanResult {
  const mockRun = buildMockCompletedCampaignRun(selectedRouteId);
  const plan = mockRun.executionPlan;

  if (!plan) {
    throw new WorkflowValidationError(
      "Mock execution plan could not be built for selected route.",
      [{ path: ["executionPlan"], message: "Mock returned undefined execution plan." }],
    );
  }

  // Validate mock output against schema to catch fixture drift immediately.
  const parsed = campaignExecutionPlanOutputSchema.parse({ executionPlan: plan });

  const traceEvent = createTraceEvent({
    runId,
    stageId: "generate_execution_plan",
    type: "stage.completed",
    status: "completed",
    message: `Execution plan generated for route "${selectedRouteId}" using mock provider.`,
    outputSchema: "CampaignExecutionPlan",
    provider: "mock",
    model: "mock-execution-planner",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
    metadata: {
      selectedRouteId,
      routeCount: routes.length,
    },
  });

  return { executionPlan: parsed.executionPlan, traceEvent };
}

// --- OpenAI path ---

async function generateExecutionPlanWithOpenAI(
  input: {
    normalizedBrief: NormalizedCampaignBrief;
    strategicTension: StrategicTension;
    routes: CampaignRoute[];
    personas: Persona[];
    simulations: PersonaSimulation[];
    scores: RouteScore[];
    premortemReview: PremortemReview;
    comparison: RouteComparisonMatrix;
    selectedRouteId: string;
    runId: string;
  },
): Promise<GenerateExecutionPlanResult> {
  const {
    normalizedBrief,
    strategicTension,
    selectedRouteId,
    runId,
  } = input;

  const selectedRoute = input.routes.find((r) => r.id === selectedRouteId);
  const comparisonRow = input.comparison.rows.find((r) => r.routeId === selectedRouteId);
  const selectedSimulations = input.simulations.filter((s) => s.routeId === selectedRouteId);
  const selectedPremortem = input.premortemReview.routeRisks.find((r) => r.routeId === selectedRouteId);

  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt = [
    promptTemplate.trim(),
    "",
    "## SELECTED ROUTE",
    "",
    JSON.stringify(selectedRoute, null, 2),
    "",
    "## NORMALIZED BRIEF",
    "",
    JSON.stringify(normalizedBrief, null, 2),
    "",
    "## STRATEGIC TENSION",
    "",
    JSON.stringify(strategicTension, null, 2),
    "",
    "## COMPARISON ROW FOR SELECTED ROUTE",
    "",
    JSON.stringify(comparisonRow ?? null, null, 2),
    "",
    "## AUDIENCE SIMULATIONS FOR SELECTED ROUTE",
    "",
    JSON.stringify(selectedSimulations, null, 2),
    "",
    "## PRE-MORTEM RISKS FOR SELECTED ROUTE",
    "",
    JSON.stringify(selectedPremortem ?? null, null, 2),
  ].join("\n");

  const startMs = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: campaignExecutionPlanOutputSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "generate_execution_plan",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? `Execution plan generated for route "${selectedRouteId}" via OpenAI.`
            : `Execution plan generated for route "${selectedRouteId}" via OpenAI after one retry.`,
        outputSchema: "CampaignExecutionPlan",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
        metadata: {
          selectedRouteId,
        },
      });

      return { executionPlan: result.data.executionPlan, traceEvent };
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof LlmJsonParseError ||
        err instanceof LlmSchemaValidationError;
      if (!isRetryable || attempt === 2) {
        break;
      }
    }
  }

  throw lastError;
}

// --- Public API ---

/**
 * Generate a campaign execution plan for the human-selected route.
 *
 * SAFETY: This is a strategic planning tool, not market research.
 * Synthetic audience reactions are planning hypotheses only and must never be
 * presented as validated customer evidence. This stage must never claim predicted
 * success or real campaign performance metrics.
 *
 * - Validates that selectedRouteId exists in routes.
 * - In mock mode: returns a deterministic execution plan immediately.
 * - In openai mode: loads the prompt file, injects focused context for the
 *   selected route only, calls the model, validates with Zod, retries once on
 *   parse/schema failure.
 *
 * Throws WorkflowValidationError if selectedRouteId is invalid.
 * Throws typed LLM errors on provider/parse/schema failure.
 * Never returns unvalidated output.
 */
export async function generateExecutionPlanStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
  scores: RouteScore[];
  premortemReview: PremortemReview;
  comparison: RouteComparisonMatrix;
  selectedRouteId: string;
  runId?: string;
}): Promise<GenerateExecutionPlanResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;

  validateSelectedRoute({ selectedRouteId: input.selectedRouteId, routes: input.routes });

  if (env.provider === "mock") {
    return generateExecutionPlanMock(input.routes, input.selectedRouteId, runId);
  }

  return generateExecutionPlanWithOpenAI({ ...input, runId });
}
