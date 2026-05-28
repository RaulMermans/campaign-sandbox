// Tests for scoreRoutesStage.
// Runs without any env vars set — stage is fully deterministic.
// No LLM calls. No provider required.

import { describe, expect, it } from "vitest";
import { scoreRoutesStage } from "@/lib/workflow/stages/score-routes-stage";
import {
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";
import {
  routeScoresOutputSchema,
  type CampaignRoute,
  type Persona,
  type PersonaSimulation,
} from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

const SAMPLE_INPUT = {
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
};

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("scoreRoutesStage – output shape", () => {
  it("returns valid RouteScore[] and traceEvent", async () => {
    const result = await scoreRoutesStage(SAMPLE_INPUT);
    expect(result.scores).toBeDefined();
    expect(result.traceEvent).toBeDefined();
    expect(Array.isArray(result.scores)).toBe(true);
  });

  it("output validates against routeScoresOutputSchema", async () => {
    const { scores } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(() => routeScoresOutputSchema.parse({ scores })).not.toThrow();
  });

  it("returns exactly one score per route", async () => {
    const { scores } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(scores).toHaveLength(MOCK_ROUTES.length);
    const routeIds = new Set(scores.map((s) => s.routeId));
    expect(routeIds.size).toBe(MOCK_ROUTES.length);
  });

  it("score route IDs match input route IDs", async () => {
    const { scores } = await scoreRoutesStage(SAMPLE_INPUT);
    const inputIds = new Set(MOCK_ROUTES.map((r) => r.id));
    for (const score of scores) {
      expect(inputIds.has(score.routeId)).toBe(true);
    }
  });

  it("all scores are in [1, 5]", async () => {
    const { scores } = await scoreRoutesStage(SAMPLE_INPUT);
    for (const score of scores) {
      expect(score.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(score.weightedTotal).toBeLessThanOrEqual(5);
      for (const value of Object.values(score.scores)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Trace event
// ---------------------------------------------------------------------------

describe("scoreRoutesStage – trace event", () => {
  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event provider is 'deterministic'", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("deterministic");
  });

  it("trace event model is 'score-routes-v1'", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.model).toBe("score-routes-v1");
  });

  it("trace event costUsd is 0", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is 'score_routes'", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("score_routes");
  });

  it("custom runId is preserved in trace event", async () => {
    const { traceEvent } = await scoreRoutesStage({
      ...SAMPLE_INPUT,
      runId: "my-custom-run",
    });
    expect(traceEvent.runId).toBe("my-custom-run");
  });

  it("trace event metadata includes routeCount and simulationCount", async () => {
    const { traceEvent } = await scoreRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.metadata.routeCount).toBe(MOCK_ROUTES.length);
    expect(traceEvent.metadata.simulationCount).toBe(MOCK_SIMULATIONS.length);
    expect(traceEvent.metadata.scoringMode).toBe("deterministic");
  });
});

// ---------------------------------------------------------------------------
// Coverage validation
// ---------------------------------------------------------------------------

describe("scoreRoutesStage – coverage validation", () => {
  it("throws WorkflowValidationError when a simulation references an unknown route", async () => {
    const badSimulation: PersonaSimulation = {
      ...MOCK_SIMULATIONS[0],
      routeId: "route-does-not-exist",
    };

    await expect(
      scoreRoutesStage({
        ...SAMPLE_INPUT,
        simulations: [...MOCK_SIMULATIONS, badSimulation],
      }),
    ).rejects.toThrow();
  });

  it("throws when simulations are missing for a route/persona pair", async () => {
    const incomplete = MOCK_SIMULATIONS.slice(1);

    await expect(
      scoreRoutesStage({ ...SAMPLE_INPUT, simulations: incomplete }),
    ).rejects.toThrow();
  });

  it("throws when there are no simulations at all", async () => {
    await expect(
      scoreRoutesStage({ ...SAMPLE_INPUT, simulations: [] }),
    ).rejects.toThrow();
  });

  it("throws WorkflowValidationError (not a generic error) for coverage failures", async () => {
    const incomplete = MOCK_SIMULATIONS.slice(1);

    const err = await scoreRoutesStage({ ...SAMPLE_INPUT, simulations: incomplete }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(WorkflowValidationError);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("scoreRoutesStage – determinism", () => {
  it("produces identical scores on repeated calls", async () => {
    const first = await scoreRoutesStage(SAMPLE_INPUT);
    const second = await scoreRoutesStage(SAMPLE_INPUT);
    expect(first.scores).toEqual(second.scores);
  });
});
