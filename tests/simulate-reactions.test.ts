// Tests for simulateReactionsStage and validateSimulationCoverage.
// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".
// OpenAI paths use mocked fetch — no real API calls are made.

import { afterEach, describe, expect, it, vi } from "vitest";
import { simulateReactionsStage } from "@/lib/workflow/stages/simulate-reactions";
import { validateSimulationCoverage } from "@/lib/workflow/validate-simulations";
import {
  personaSimulationSchema,
  personaSimulationsOutputSchema,
} from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
} from "@/lib/workflow/mock-campaign-run";

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
  personas: MOCK_PERSONAS,
};

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

describe("simulateReactionsStage – mock mode", () => {
  it("returns a result with simulations and traceEvent", async () => {
    const result = await simulateReactionsStage(SAMPLE_INPUT);
    expect(result.simulations).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against personaSimulationsOutputSchema", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    expect(() =>
      personaSimulationsOutputSchema.parse({ simulations }),
    ).not.toThrow();
  });

  it("simulations cover every route/persona pair exactly once", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    const expectedCount = MOCK_CAMPAIGN_ROUTES.length * MOCK_PERSONAS.length;
    expect(simulations.length).toBe(expectedCount);

    const pairs = new Set(
      simulations.map((s) => `${s.routeId}:${s.personaId}`),
    );
    expect(pairs.size).toBe(expectedCount);
  });

  it("every routeId matches an input route", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    const routeIds = new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id));
    for (const sim of simulations) {
      expect(routeIds.has(sim.routeId)).toBe(true);
    }
  });

  it("every personaId matches an input persona", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    const personaIds = new Set(MOCK_PERSONAS.map((p) => p.id));
    for (const sim of simulations) {
      expect(personaIds.has(sim.personaId)).toBe(true);
    }
  });

  it("every simulation caveat contains the word 'synthetic'", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    for (const sim of simulations) {
      expect(sim.caveat.toLowerCase()).toContain("synthetic");
    }
  });

  it("all scores are bounded between 1 and 5", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    for (const sim of simulations) {
      expect(sim.resonanceScore).toBeGreaterThanOrEqual(1);
      expect(sim.resonanceScore).toBeLessThanOrEqual(5);
      expect(sim.conversionIntent).toBeGreaterThanOrEqual(1);
      expect(sim.conversionIntent).toBeLessThanOrEqual(5);
      expect(sim.signupIntent).toBeGreaterThanOrEqual(1);
      expect(sim.signupIntent).toBeLessThanOrEqual(5);
    }
  });

  it("each simulation validates against personaSimulationSchema", async () => {
    const { simulations } = await simulateReactionsStage(SAMPLE_INPUT);
    for (const sim of simulations) {
      expect(() => personaSimulationSchema.parse(sim)).not.toThrow();
    }
  });

  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await simulateReactionsStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const { traceEvent } = await simulateReactionsStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-reaction-simulator");
    expect(traceEvent.promptVersion).toBe("simulate_reactions.v1");
  });

  it("trace event has costUsd: 0 in mock mode", async () => {
    const { traceEvent } = await simulateReactionsStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is simulate_reactions and status is completed", async () => {
    const { traceEvent } = await simulateReactionsStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("simulate_reactions");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId and preserves it in the trace event", async () => {
    const { traceEvent } = await simulateReactionsStage({
      ...SAMPLE_INPUT,
      runId: "run-simulations-test-999",
    });
    expect(traceEvent.runId).toBe("run-simulations-test-999");
  });

  it("generates deterministic placeholder simulations for pairs outside the NODO fixture", async () => {
    // Use routes and personas that are not in the NODO mock fixture.
    const customRoutes = [
      {
        ...MOCK_CAMPAIGN_ROUTES[0],
        id: "route-custom-a",
      },
    ];
    const customPersonas = [
      {
        ...MOCK_PERSONAS[0],
        id: "persona-custom-x",
      },
    ];
    const { simulations } = await simulateReactionsStage({
      ...SAMPLE_INPUT,
      routes: customRoutes,
      personas: customPersonas,
    });
    expect(simulations.length).toBe(1);
    expect(simulations[0].routeId).toBe("route-custom-a");
    expect(simulations[0].personaId).toBe("persona-custom-x");
    expect(simulations[0].caveat.toLowerCase()).toContain("synthetic");
  });
});

// ---------------------------------------------------------------------------
// validateSimulationCoverage helper
// ---------------------------------------------------------------------------

describe("validateSimulationCoverage", () => {
  const baseRoutes = MOCK_CAMPAIGN_ROUTES.slice(0, 2);
  const basePersonas = MOCK_PERSONAS.slice(0, 2);

  function makeSimulation(routeId: string, personaId: string) {
    return {
      routeId,
      personaId,
      likelyReaction: "Synthetic reaction.",
      positives: ["positive one"],
      objections: ["objection one"],
      quotedReaction: "A quoted synthetic reaction.",
      resonanceScore: 3 as const,
      conversionIntent: 3 as const,
      signupIntent: 3 as const,
      confidence: "medium" as const,
      caveat: "Synthetic planning estimate. Not real research.",
      understoodMessage: "The campaign communicates a clear brand point of view.",
      mainObjection: "Insufficient product visibility to justify purchase.",
      actionTrigger: "Clearer product framing with a direct path to purchase.",
      bestCTA: "See the collection",
    };
  }

  it("passes when every route/persona pair has exactly one simulation", () => {
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      makeSimulation(baseRoutes[0].id, basePersonas[1].id),
      makeSimulation(baseRoutes[1].id, basePersonas[0].id),
      makeSimulation(baseRoutes[1].id, basePersonas[1].id),
    ];
    expect(() =>
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas }),
    ).not.toThrow();
  });

  it("throws LlmSchemaValidationError when a route/persona pair is missing", () => {
    // Only 3 of 4 pairs provided.
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      makeSimulation(baseRoutes[0].id, basePersonas[1].id),
      makeSimulation(baseRoutes[1].id, basePersonas[0].id),
      // missing: baseRoutes[1].id × basePersonas[1].id
    ];
    expect(() =>
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas }),
    ).toThrow(LlmSchemaValidationError);
  });

  it("throws LlmSchemaValidationError when a simulation references an unknown routeId", () => {
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      makeSimulation(baseRoutes[0].id, basePersonas[1].id),
      makeSimulation("route-does-not-exist", basePersonas[0].id),
      makeSimulation(baseRoutes[1].id, basePersonas[1].id),
    ];
    expect(() =>
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas }),
    ).toThrow(LlmSchemaValidationError);
  });

  it("throws LlmSchemaValidationError when a simulation references an unknown personaId", () => {
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      makeSimulation(baseRoutes[0].id, "persona-does-not-exist"),
      makeSimulation(baseRoutes[1].id, basePersonas[0].id),
      makeSimulation(baseRoutes[1].id, basePersonas[1].id),
    ];
    expect(() =>
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas }),
    ).toThrow(LlmSchemaValidationError);
  });

  it("throws LlmSchemaValidationError when a pair is duplicated", () => {
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      makeSimulation(baseRoutes[0].id, basePersonas[0].id), // duplicate
      makeSimulation(baseRoutes[0].id, basePersonas[1].id),
      makeSimulation(baseRoutes[1].id, basePersonas[0].id),
      makeSimulation(baseRoutes[1].id, basePersonas[1].id),
    ];
    expect(() =>
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas }),
    ).toThrow(LlmSchemaValidationError);
  });

  it("error message mentions the missing pair", () => {
    const simulations = [
      makeSimulation(baseRoutes[0].id, basePersonas[0].id),
      // all others missing
    ];
    try {
      validateSimulationCoverage({ simulations, routes: baseRoutes, personas: basePersonas });
      expect.fail("Expected LlmSchemaValidationError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LlmSchemaValidationError);
      expect((err as LlmSchemaValidationError).message).toContain("coverage validation failed");
    }
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces typed errors
// ---------------------------------------------------------------------------

describe("simulateReactionsStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  simulations: [{ not_a_valid_field: true }],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      simulateReactionsStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmSchemaValidationError);
  });

  it("throws LlmSchemaValidationError when model returns missing route/persona pair", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Return only one simulation when 9 are expected (3 routes × 3 personas).
    const partialSimulation = {
      routeId: MOCK_CAMPAIGN_ROUTES[0].id,
      personaId: MOCK_PERSONAS[0].id,
      likelyReaction: "Synthetic reaction.",
      positives: ["relevant"],
      objections: ["not enough"],
      quotedReaction: "Seems fine.",
      resonanceScore: 3,
      conversionIntent: 3,
      signupIntent: 3,
      confidence: "medium",
      caveat: "Synthetic estimate. Not real research.",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ simulations: [partialSimulation] }),
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      simulateReactionsStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmSchemaValidationError);
  });

  it("throws LlmJsonParseError when model returns non-JSON content", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  "Here are the audience reactions I have generated for your campaign...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      simulateReactionsStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set — env.openaiApiKey will be "".

    await expect(
      simulateReactionsStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError when the OpenAI API returns a non-OK response", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limit exceeded",
      }),
    );

    await expect(
      simulateReactionsStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
