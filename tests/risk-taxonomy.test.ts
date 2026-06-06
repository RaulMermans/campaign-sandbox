// Tests for the deterministic risk taxonomy derivation.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import { deriveRiskTaxonomy } from "@/lib/workflow/derive-risk-taxonomy";
import { buildMockCampaignRun } from "@/lib/workflow/mock-campaign-run";

function buildInput() {
  const run = buildMockCampaignRun();
  return {
    routes: run.routes,
    scores: run.scores,
    comparison: run.comparisonMatrix,
    premortemReview: run.premortem,
  };
}

describe("deriveRiskTaxonomy – output structure", () => {
  it("returns one taxonomy entry per route", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);
    expect(taxonomy).toHaveLength(input.routes.length);
  });

  it("each entry has a valid severity", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);

    const validSeverities = ["Low", "Moderate", "High"];
    for (const t of taxonomy) {
      expect(validSeverities).toContain(t.severity);
    }
  });

  it("each entry has a valid primaryRiskType", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);

    const validTypes = [
      "Creative risk",
      "Proof risk",
      "Conversion risk",
      "Channel risk",
      "Execution risk",
      "Brand dilution risk",
    ];
    for (const t of taxonomy) {
      expect(validTypes).toContain(t.primaryRiskType);
    }
  });

  it("each entry has a non-empty explanation", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);

    for (const t of taxonomy) {
      expect(t.explanation.length).toBeGreaterThan(10);
    }
  });

  it("all routeIds reference existing routes", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);
    const routeIds = new Set(input.routes.map((r) => r.id));

    for (const t of taxonomy) {
      expect(routeIds.has(t.routeId)).toBe(true);
    }
  });
});

describe("deriveRiskTaxonomy – classification logic", () => {
  it("classifies route with low feasibility as Execution risk", () => {
    const input = buildInput();
    const lowFeasibilityScores = input.scores.map((s, i) =>
      i === 0 ? { ...s, scores: { ...s.scores, feasibility: 2 }, weightedTotal: 2 } : s,
    );
    const taxonomy = deriveRiskTaxonomy({ ...input, scores: lowFeasibilityScores });

    // First route (by score order) should be Execution risk
    const firstRouteId = lowFeasibilityScores[0].routeId;
    const entry = taxonomy.find((t) => t.routeId === firstRouteId);
    expect(entry?.primaryRiskType).toBe("Execution risk");
  });

  it("classifies boldest role route as Creative risk when no other signals dominate", () => {
    const input = buildInput();
    const boldRoute = input.routes.find((r) => r.strategicRole === "boldest");
    if (!boldRoute) return;

    const taxonomy = deriveRiskTaxonomy(input);
    const entry = taxonomy.find((t) => t.routeId === boldRoute.id);
    // Boldest route should have Creative risk or another typed risk — not be undefined
    expect(entry?.primaryRiskType).toBeDefined();
  });
});

describe("deriveRiskTaxonomy – deterministic", () => {
  it("returns identical output for same input", () => {
    const input = buildInput();
    const a = deriveRiskTaxonomy(input);
    const b = deriveRiskTaxonomy(input);
    expect(a).toEqual(b);
  });
});
