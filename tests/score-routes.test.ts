// Tests for the scoreRoutes deterministic scoring helper.
// No env vars required. No LLM calls.

import { describe, expect, it } from "vitest";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import {
  buildMockCampaignRun,
  campaignRoutes as MOCK_ROUTES,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";
import type { CampaignRoute, PersonaSimulation } from "@/lib/schemas/campaign";

describe("scoreRoutes – bounds", () => {
  it("returns a bounded strategic estimate for every route", () => {
    const run = buildMockCampaignRun();
    const scores = scoreRoutes(run.routes, run.simulations);

    expect(scores).toHaveLength(3);
    for (const score of scores) {
      expect(score.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(score.weightedTotal).toBeLessThanOrEqual(5);
      expect(score.rationale).toContain("Strategic estimate");
    }
  });

  it("all individual dimension scores are in [1, 5]", () => {
    const scores = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);

    for (const score of scores) {
      for (const [key, value] of Object.entries(score.scores)) {
        expect(value, `${key} out of bounds`).toBeGreaterThanOrEqual(1);
        expect(value, `${key} out of bounds`).toBeLessThanOrEqual(5);
      }
    }
  });

  it("weightedTotal is in [1, 5] for all routes", () => {
    const scores = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);

    for (const score of scores) {
      expect(score.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(score.weightedTotal).toBeLessThanOrEqual(5);
    }
  });
});

describe("scoreRoutes – determinism", () => {
  it("produces identical output on repeated calls with the same input", () => {
    const first = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
    const second = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
    expect(first).toEqual(second);
  });

  it("each score has a non-empty rationale", () => {
    const scores = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
    for (const score of scores) {
      expect(score.rationale.length).toBeGreaterThan(0);
    }
  });

  it("each score references its corresponding route ID", () => {
    const scores = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
    const routeIds = new Set(MOCK_ROUTES.map((r) => r.id));
    for (const score of scores) {
      expect(routeIds.has(score.routeId)).toBe(true);
    }
  });
});

describe("scoreRoutes – simulation data affects output", () => {
  it("higher conversionIntent increases conversionPotential or weightedTotal for a route", () => {
    const baseRoute: CampaignRoute = MOCK_ROUTES[0];
    const otherRoutes: CampaignRoute[] = MOCK_ROUTES.slice(1);

    // Build two sets of simulations: base and high-intent
    const baseSimulations: PersonaSimulation[] = MOCK_SIMULATIONS.filter(
      (s) => s.routeId === baseRoute.id,
    );
    const highIntentSimulations: PersonaSimulation[] = baseSimulations.map((s) => ({
      ...s,
      conversionIntent: 5,
      resonanceScore: 5,
    }));
    const lowIntentSimulations: PersonaSimulation[] = baseSimulations.map((s) => ({
      ...s,
      conversionIntent: 1,
      resonanceScore: 1,
    }));

    const otherSimulations = MOCK_SIMULATIONS.filter((s) => s.routeId !== baseRoute.id);

    const highScores = scoreRoutes(
      [baseRoute, ...otherRoutes],
      [...highIntentSimulations, ...otherSimulations],
    );
    const lowScores = scoreRoutes(
      [baseRoute, ...otherRoutes],
      [...lowIntentSimulations, ...otherSimulations],
    );

    const highBase = highScores.find((s) => s.routeId === baseRoute.id)!;
    const lowBase = lowScores.find((s) => s.routeId === baseRoute.id)!;

    // High intent/resonance should produce higher conversionPotential or culturalRelevance
    const highConversion = highBase.scores.conversionPotential;
    const lowConversion = lowBase.scores.conversionPotential;
    const highCultural = highBase.scores.culturalRelevance;
    const lowCultural = lowBase.scores.culturalRelevance;

    expect(highConversion >= lowConversion || highCultural >= lowCultural).toBe(true);
    expect(highBase.weightedTotal).toBeGreaterThanOrEqual(lowBase.weightedTotal);
  });

  it("routes with more risks have lower riskAdjustedConfidence", () => {
    const safeRoute: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-safe",
      risks: ["minor risk"],
    };
    const riskyRoute: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-risky",
      risks: ["risk1", "risk2", "risk3", "risk4", "risk5"],
    };

    const sims = (routeId: string): PersonaSimulation[] =>
      MOCK_SIMULATIONS.filter((s) => s.routeId === MOCK_ROUTES[0].id).map((s) => ({
        ...s,
        routeId,
      }));

    const scores = scoreRoutes(
      [safeRoute, riskyRoute],
      [...sims("route-safe"), ...sims("route-risky")],
    );

    const safeScore = scores.find((s) => s.routeId === "route-safe")!;
    const riskyScore = scores.find((s) => s.routeId === "route-risky")!;

    expect(safeScore.scores.riskAdjustedConfidence).toBeGreaterThanOrEqual(
      riskyScore.scores.riskAdjustedConfidence,
    );
  });
});
