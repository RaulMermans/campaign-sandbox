// Tests for compareRoutesStage and the underlying compareRoutes helper.
// Runs without any env vars — the stage is fully deterministic.
// No LLM calls. No provider required.

import { describe, expect, it } from "vitest";
import { compareRoutesStage } from "@/lib/workflow/stages/compare-routes-stage";
import {
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import {
  routeComparisonMatrixSchema,
  type CampaignRoute,
  type PersonaSimulation,
} from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

const MOCK_SCORES = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);

const SAMPLE_INPUT = {
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
};

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("compareRoutesStage – output shape", () => {
  it("returns valid RouteComparisonMatrix and traceEvent", async () => {
    const result = await compareRoutesStage(SAMPLE_INPUT);
    expect(result.comparison).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against routeComparisonMatrixSchema", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    expect(() => routeComparisonMatrixSchema.parse(comparison)).not.toThrow();
  });

  it("comparison has exactly one row per route", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    expect(comparison.rows).toHaveLength(MOCK_ROUTES.length);
    const rowIds = new Set(comparison.rows.map((r) => r.routeId));
    expect(rowIds.size).toBe(MOCK_ROUTES.length);
  });

  it("recommendedRouteId references an existing route", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    const rowIds = new Set(comparison.rows.map((r) => r.routeId));
    expect(rowIds.has(comparison.recommendedRouteId)).toBe(true);
  });

  it("all scores are in [1, 5]", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    for (const row of comparison.rows) {
      expect(row.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(row.weightedTotal).toBeLessThanOrEqual(5);
      expect(row.audienceResonance).toBeGreaterThanOrEqual(1);
      expect(row.audienceResonance).toBeLessThanOrEqual(5);
      expect(row.conversionPotential).toBeGreaterThanOrEqual(1);
      expect(row.conversionPotential).toBeLessThanOrEqual(5);
      expect(row.feasibility).toBeGreaterThanOrEqual(1);
      expect(row.feasibility).toBeLessThanOrEqual(5);
    }
  });

  it("each row has at least one keyStrength and keyRisk", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    for (const row of comparison.rows) {
      expect(row.keyStrengths.length).toBeGreaterThanOrEqual(1);
      expect(row.keyRisks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("riskLevel is one of low, medium, high", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    for (const row of comparison.rows) {
      expect(["low", "medium", "high"]).toContain(row.riskLevel);
    }
  });

  it("summary and decisionNotes are non-empty", async () => {
    const { comparison } = await compareRoutesStage(SAMPLE_INPUT);
    expect(comparison.summary.length).toBeGreaterThan(0);
    expect(comparison.decisionNotes.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Trace event
// ---------------------------------------------------------------------------

describe("compareRoutesStage – trace event", () => {
  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await compareRoutesStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event provider is 'deterministic'", async () => {
    const { traceEvent } = await compareRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("deterministic");
  });

  it("trace event model is 'compare-routes-v1'", async () => {
    const { traceEvent } = await compareRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.model).toBe("compare-routes-v1");
  });

  it("trace event stageId is 'compare_routes'", async () => {
    const { traceEvent } = await compareRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("compare_routes");
  });

  it("trace event costUsd is 0", async () => {
    const { traceEvent } = await compareRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("custom runId is preserved in trace event", async () => {
    const { traceEvent } = await compareRoutesStage({
      ...SAMPLE_INPUT,
      runId: "my-custom-run",
    });
    expect(traceEvent.runId).toBe("my-custom-run");
  });

  it("trace event metadata includes routeCount and recommendedRouteId", async () => {
    const { traceEvent, comparison } = await compareRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.metadata.routeCount).toBe(MOCK_ROUTES.length);
    expect(traceEvent.metadata.recommendedRouteId).toBe(comparison.recommendedRouteId);
    expect(traceEvent.metadata.comparisonMode).toBe("deterministic");
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("compareRoutesStage – determinism", () => {
  it("produces identical comparison on repeated calls", async () => {
    const first = await compareRoutesStage(SAMPLE_INPUT);
    const second = await compareRoutesStage(SAMPLE_INPUT);
    expect(first.comparison).toEqual(second.comparison);
  });
});

// ---------------------------------------------------------------------------
// Coverage validation
// ---------------------------------------------------------------------------

describe("compareRoutesStage – coverage validation", () => {
  it("throws WorkflowValidationError when a simulation references an unknown route", async () => {
    const badSimulation: PersonaSimulation = {
      ...MOCK_SIMULATIONS[0],
      routeId: "route-does-not-exist",
    };
    await expect(
      compareRoutesStage({
        ...SAMPLE_INPUT,
        simulations: [...MOCK_SIMULATIONS, badSimulation],
      }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when simulations are missing", async () => {
    await expect(
      compareRoutesStage({ ...SAMPLE_INPUT, simulations: MOCK_SIMULATIONS.slice(1) }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when scores are missing for a route", async () => {
    await expect(
      compareRoutesStage({ ...SAMPLE_INPUT, scores: MOCK_SCORES.slice(1) }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when premortem route coverage is missing", async () => {
    const incompletePremortem = {
      ...MOCK_PREMORTEM,
      routeRisks: MOCK_PREMORTEM.routeRisks.slice(1),
    };
    await expect(
      compareRoutesStage({ ...SAMPLE_INPUT, premortemReview: incompletePremortem }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it("throws WorkflowValidationError (not a generic error) for simulation coverage failures", async () => {
    const err = await compareRoutesStage({
      ...SAMPLE_INPUT,
      simulations: MOCK_SIMULATIONS.slice(1),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkflowValidationError);
  });

  it("throws when routes contain duplicate IDs in comparison output via invalid schema", async () => {
    const duplicateRoute: CampaignRoute = { ...MOCK_ROUTES[0], id: MOCK_ROUTES[1].id };
    await expect(
      compareRoutesStage({ ...SAMPLE_INPUT, routes: [duplicateRoute, ...MOCK_ROUTES.slice(1)] }),
    ).rejects.toThrow();
  });
});
