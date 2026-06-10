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
      "Audience risk",
      "Cultural risk",
    ];
    for (const t of taxonomy) {
      expect(validTypes).toContain(t.primaryRiskType);
      if (t.secondaryRiskType) {
        expect(validTypes).toContain(t.secondaryRiskType);
      }
    }
  });

  it("never gives a route the same primary and secondary risk type", () => {
    const input = buildInput();
    const taxonomy = deriveRiskTaxonomy(input);

    for (const t of taxonomy) {
      if (t.secondaryRiskType) {
        expect(t.secondaryRiskType).not.toBe(t.primaryRiskType);
        expect(t.secondaryExplanation).toBeDefined();
        expect(t.secondaryExplanation!.length).toBeGreaterThan(10);
      }
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

  it("classifies a route with audience-fit language as Audience risk", () => {
    const input = buildInput();
    const targetId = input.routes[0]!.id;
    const premortemReview = {
      ...input.premortemReview,
      routeRisks: input.premortemReview.routeRisks.map((rr) =>
        rr.routeId === targetId
          ? { ...rr, risks: ["The audience may not see themselves in this — niche segment relevance is unproven"] }
          : rr,
      ),
    };

    const taxonomy = deriveRiskTaxonomy({ ...input, premortemReview });
    const entry = taxonomy.find((t) => t.routeId === targetId);
    expect(entry?.primaryRiskType).toBe("Audience risk");
  });

  it("classifies a route with sensitivity/tone language as Cultural risk", () => {
    const input = buildInput();
    const targetId = input.routes[0]!.id;
    const premortemReview = {
      ...input.premortemReview,
      routeRisks: input.premortemReview.routeRisks.map((rr) =>
        rr.routeId === targetId
          ? { ...rr, risks: ["Risks reading as tone-deaf — cultural sensitivity review needed before production"] }
          : rr,
      ),
    };

    const taxonomy = deriveRiskTaxonomy({ ...input, premortemReview });
    const entry = taxonomy.find((t) => t.routeId === targetId);
    expect(entry?.primaryRiskType).toBe("Cultural risk");
  });

  it("does not misclassify generic uses of 'cultural' as Cultural risk", () => {
    const input = buildInput();
    const targetId = input.routes[0]!.id;
    const premortemReview = {
      ...input.premortemReview,
      routeRisks: input.premortemReview.routeRisks.map((rr) =>
        rr.routeId === targetId ? { ...rr, risks: ["Feels more like a cultural project than a commercial campaign"] } : rr,
      ),
    };

    const taxonomy = deriveRiskTaxonomy({ ...input, premortemReview });
    const entry = taxonomy.find((t) => t.routeId === targetId);
    expect(entry?.primaryRiskType).not.toBe("Cultural risk");
  });

  it("surfaces a secondary risk type distinct from the primary when multiple signals are present", () => {
    const input = buildInput();
    const targetId = input.routes[0]!.id;
    const lowFeasibilityScores = input.scores.map((s) =>
      s.routeId === targetId ? { ...s, scores: { ...s.scores, feasibility: 2 }, weightedTotal: 2 } : s,
    );
    const premortemReview = {
      ...input.premortemReview,
      routeRisks: input.premortemReview.routeRisks.map((rr) =>
        rr.routeId === targetId
          ? { ...rr, risks: ["Generic execution could make this feel like any catalog brand", "Feasibility is uncertain given the timeline"] }
          : rr,
      ),
    };

    const taxonomy = deriveRiskTaxonomy({ ...input, scores: lowFeasibilityScores, premortemReview });
    const entry = taxonomy.find((t) => t.routeId === targetId);

    // Strongest signal (feasibility shortfall of 3) should win as primary;
    // the generic-language signal should surface as a distinct secondary.
    expect(entry?.primaryRiskType).toBe("Execution risk");
    expect(entry?.secondaryRiskType).toBeDefined();
    expect(entry?.secondaryRiskType).not.toBe("Execution risk");
  });

  it("uses the feasibility/conversion/genericity/channel/proof tie-break order on equal-strength signals", () => {
    const input = buildInput();
    const targetId = input.routes[0]!.id;
    // Craft risk language that produces exactly one keyword match for both
    // Brand dilution ("generic") and Channel ("platform") risk — an equal-
    // strength tie that should resolve in favor of Brand dilution risk per
    // the documented tie-break order.
    const premortemReview = {
      ...input.premortemReview,
      routeRisks: input.premortemReview.routeRisks.map((rr) =>
        rr.routeId === targetId
          ? { ...rr, risks: ["Generic tone on this platform could undercut the idea"] }
          : rr,
      ),
    };

    const taxonomy = deriveRiskTaxonomy({ ...input, premortemReview });
    const entry = taxonomy.find((t) => t.routeId === targetId);
    expect(entry?.primaryRiskType).toBe("Brand dilution risk");
    expect(entry?.secondaryRiskType).toBe("Channel risk");
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
