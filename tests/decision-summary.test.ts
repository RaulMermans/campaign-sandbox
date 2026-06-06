// Tests for the deterministic decision summary builder.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import { buildDecisionSummary } from "@/lib/workflow/build-decision-summary";
import {
  buildMockCampaignRun,
  campaignRoutes as MOCK_ROUTES,
  premortemReview as MOCK_PREMORTEM,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { compareRoutes } from "@/lib/scoring/compare-routes";

function buildInput() {
  const run = buildMockCampaignRun();
  return {
    routes: run.routes,
    scores: run.scores,
    comparison: run.comparisonMatrix,
    premortemReview: run.premortem,
  };
}

describe("buildDecisionSummary – recommended route", () => {
  it("returns a recommendedRouteId that exists in routes", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);

    const routeIds = input.routes.map((r) => r.id);
    expect(routeIds).toContain(summary.recommendedRouteId);
  });

  it("returns a recommendedRouteName matching the route", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);

    const route = input.routes.find((r) => r.id === summary.recommendedRouteId);
    expect(summary.recommendedRouteName).toBe(route?.name);
  });

  it("whyItWins is a non-empty string", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);
    expect(summary.whyItWins.length).toBeGreaterThan(0);
  });
});

describe("buildDecisionSummary – runner-up", () => {
  it("returns a runnerUpRouteId when there are multiple routes", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);
    // With 3+ routes, runner-up should exist
    expect(summary.runnerUpRouteId).toBeDefined();
    expect(summary.runnerUpRouteId).not.toBe(summary.recommendedRouteId);
  });

  it("returns runnerUpStrength when runner-up exists", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);
    expect(summary.runnerUpStrength).toBeDefined();
    expect(summary.runnerUpStrength!.length).toBeGreaterThan(0);
  });
});

describe("buildDecisionSummary – tradeoff and risk", () => {
  it("returns a non-empty biggestTradeoff string", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);
    expect(summary.biggestTradeoff.length).toBeGreaterThan(0);
  });

  it("returns a valid riskType enum value", () => {
    const input = buildInput();
    const summary = buildDecisionSummary(input);

    const validRiskTypes = [
      "Creative risk",
      "Proof risk",
      "Conversion risk",
      "Channel risk",
      "Execution risk",
      "Brand dilution risk",
    ];
    expect(validRiskTypes).toContain(summary.riskType);
  });
});

describe("buildDecisionSummary – close score notice", () => {
  it("shows closeScoreNotice when top two scores are within 0.2", () => {
    const input = buildInput();
    // Manually set two scores very close
    const sortedScores = [...input.scores].sort((a, b) => b.weightedTotal - a.weightedTotal);
    if (sortedScores.length >= 2) {
      sortedScores[1] = {
        ...sortedScores[1],
        weightedTotal: sortedScores[0].weightedTotal - 0.1,
      };
    }

    const summary = buildDecisionSummary({ ...input, scores: sortedScores });
    expect(summary.closeScoreNotice).toBeDefined();
    expect(summary.closeScoreNotice).toContain("close");
  });

  it("omits closeScoreNotice when scores are clearly separated", () => {
    const input = buildInput();
    // Force a clear gap
    const modifiedScores = input.scores.map((s, i) => ({
      ...s,
      weightedTotal: 4.5 - i * 1.0,
    }));

    const summary = buildDecisionSummary({ ...input, scores: modifiedScores });
    expect(summary.closeScoreNotice).toBeUndefined();
  });
});

describe("buildDecisionSummary – score bounds", () => {
  it("throws when no scores are provided", () => {
    const input = buildInput();
    expect(() =>
      buildDecisionSummary({ ...input, scores: [] }),
    ).toThrow();
  });

  it("throws when recommendedRouteId references a missing route", () => {
    const input = buildInput();
    const badComparison = {
      ...input.comparison,
      recommendedRouteId: "route-does-not-exist",
    };
    expect(() =>
      buildDecisionSummary({ ...input, comparison: badComparison }),
    ).toThrow();
  });
});

describe("buildDecisionSummary – deterministic output", () => {
  it("returns the same result for the same input (no randomness)", () => {
    const input = buildInput();
    const a = buildDecisionSummary(input);
    const b = buildDecisionSummary(input);
    expect(a).toEqual(b);
  });
});
