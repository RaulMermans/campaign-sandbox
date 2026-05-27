// Server-side only. Do not import in client components or pages.
// Generates synthetic persona reactions to each campaign route.
// SAFETY: These are synthetic planning devices, not real audience research.
// They do not predict real behavior, do not represent real people, and must
// never be presented as market validation, survey results, or research findings.
// Scores are bounded qualitative strategy scores (1–5), not probabilities.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  personaSimulationsOutputSchema,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type Persona,
  type PersonaSimulation,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { validateSimulationCoverage } from "@/lib/workflow/validate-simulations";
import { personaSimulations as MOCK_SIMULATIONS } from "@/lib/workflow/mock-campaign-run";

const PROMPT_FILE = "simulate_audience_reactions.md";
const PROMPT_VERSION = "simulate_reactions.v1";
const DEFAULT_RUN_ID = "stage-only";

export interface SimulateReactionsResult {
  simulations: PersonaSimulation[];
  traceEvent: TraceEvent;
}

// --- Mock path ---

function simulateReactionsMock(
  routes: CampaignRoute[],
  personas: Persona[],
  runId: string,
): SimulateReactionsResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "simulate_reactions",
    type: "stage.completed",
    status: "completed",
    message: "Synthetic audience reactions simulated using mock provider.",
    outputSchema: "PersonaSimulation[]",
    provider: "mock",
    model: "mock-reaction-simulator",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Filter MOCK_SIMULATIONS to the provided routes and personas for coverage.
  // If any combination is absent from the NODO fixture, generate a deterministic
  // placeholder so full matrix coverage is always satisfied.
  const routeIds = routes.map((r) => r.id);
  const personaIds = personas.map((p) => p.id);

  const mockIndex = new Map<string, PersonaSimulation>(
    MOCK_SIMULATIONS.map((s) => [`${s.routeId}:${s.personaId}`, s]),
  );

  const simulations: PersonaSimulation[] = [];

  for (const routeId of routeIds) {
    for (const personaId of personaIds) {
      const existing = mockIndex.get(`${routeId}:${personaId}`);

      if (existing) {
        simulations.push(existing);
      } else {
        // Deterministic placeholder for any pair not in the NODO fixture.
        simulations.push({
          routeId,
          personaId,
          likelyReaction:
            "Likely to engage if the concept is clearly communicated and product visibility is strong.",
          positives: ["relevant framing", "appropriate tone for segment"],
          objections: ["may need more product context to convert"],
          quotedReaction: "Interesting direction — I would want to see more before deciding.",
          resonanceScore: 3,
          conversionIntent: 3,
          signupIntent: 3,
          confidence: "low",
          caveat:
            "Synthetic planning estimate. Not real audience research, survey data, or market validation.",
        });
      }
    }
  }

  // Validate mock output against schema to catch any fixture drift immediately.
  const parsed = personaSimulationsOutputSchema.parse({ simulations });

  return { simulations: parsed.simulations, traceEvent };
}

// --- OpenAI path ---

async function simulateReactionsWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  routes: CampaignRoute[],
  personas: Persona[],
  runId: string,
): Promise<SimulateReactionsResult> {
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
  ].join("\n");

  const startMs = Date.now();
  let lastError: unknown;

  // One retry on JSON parse, schema validation, or coverage failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: personaSimulationsOutputSchema,
        model: env.openaiModel,
      });

      // Cross-reference validation: ensure every route/persona pair is covered.
      validateSimulationCoverage({
        simulations: result.data.simulations,
        routes,
        personas,
      });

      const durationMs = Date.now() - startMs;
      const traceEvent = createTraceEvent({
        runId,
        stageId: "simulate_reactions",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Synthetic audience reactions simulated via OpenAI."
            : "Synthetic audience reactions simulated via OpenAI after one retry.",
        outputSchema: "PersonaSimulation[]",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { simulations: result.data.simulations, traceEvent };
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
 * Simulate synthetic persona reactions to campaign routes.
 *
 * SAFETY: Reactions are synthetic planning devices grounded in the campaign inputs.
 * They are not real audience research, do not predict real behavior, and must never
 * be presented as market validation or statistical evidence.
 * Scores are bounded qualitative strategy scores (1–5), not probabilities.
 * Confidence reflects certainty in the synthetic interpretation, not real-world outcomes.
 *
 * - In mock mode: returns deterministic full-matrix simulations immediately.
 * - In openai mode: loads the prompt file, injects all four inputs, calls the model,
 *   validates with Zod, validates matrix coverage, retries once on parse/schema/coverage failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError)
 * on failure. Never returns unvalidated output.
 *
 * @param input - Validated normalized brief, strategic tension, routes, personas, and optional run ID.
 */
export async function simulateReactionsStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  routes: CampaignRoute[];
  personas: Persona[];
  runId?: string;
}): Promise<SimulateReactionsResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return simulateReactionsMock(input.routes, input.personas, runId);
  }
  return simulateReactionsWithOpenAI(
    input.normalizedBrief,
    input.strategicTension,
    input.routes,
    input.personas,
    runId,
  );
}
