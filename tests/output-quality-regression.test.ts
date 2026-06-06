// Output quality regression tests using deterministic validators + mock data.
// No real OpenAI calls. Uses fixture briefs and mock/stubbed outputs.

import { describe, expect, it } from "vitest";
import {
  validateRouteQuality,
  hasBlockingRouteQualityIssues,
} from "@/lib/workflow/quality/validate-route-quality";
import { validateProofIntegrity } from "@/lib/workflow/quality/validate-proof-integrity";
import { deriveRouteSimulationSummaries } from "@/lib/workflow/derive-route-simulation-summaries";
import { buildDecisionSummary } from "@/lib/workflow/build-decision-summary";
import { deriveRiskTaxonomy } from "@/lib/workflow/derive-risk-taxonomy";
import {
  buildMockCampaignRun,
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
  normalizedBrief as MOCK_BRIEF,
} from "@/lib/workflow/mock-campaign-run";
import type { CampaignRoute } from "@/lib/schemas/campaign";

// --- Generic route name fixture ---
const GENERIC_ROUTE_NAMES = [
  "Effortless Elegance",
  "Urban Escape",
  "Calm Curation",
  "Premium Ritual",
  "Elevated Evening",
  "Simple Choice",
  "Modern Ritual",
];

describe("quality regression – generic route names flagged", () => {
  for (const name of GENERIC_ROUTE_NAMES) {
    it(`"${name}" is flagged as an error`, () => {
      const route: CampaignRoute = {
        ...MOCK_ROUTES[0],
        id: "route-generic-test",
        name,
      };
      const issues = validateRouteQuality([route]);
      const nameErrors = issues.filter((i) => i.field === "name" && i.severity === "error");
      expect(nameErrors.length).toBeGreaterThan(0);
      expect(hasBlockingRouteQualityIssues(issues)).toBe(true);
    });
  }
});

describe("quality regression – mock routes pass quality gate", () => {
  it("NODO mock routes have no blocking quality issues", () => {
    const issues = validateRouteQuality(MOCK_ROUTES);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(false);
  });
});

describe("quality regression – proof integrity", () => {
  it("mock routes pass proof integrity check", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: MOCK_ROUTES,
    });
    expect(issues).toHaveLength(0);
  });

  it("route with 'real customer testimonials' fails proof integrity", () => {
    const route: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-proof-test",
      proofMechanism: "Feature real customer testimonials to demonstrate product quality.",
    };
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: [route],
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("error");
  });

  it("route with 'user-generated content' fails proof integrity", () => {
    const route: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-ugc-test",
      proofMechanism: "Drive user-generated content from satisfied customers.",
    };
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: [route],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("'customer proof if available' language passes proof integrity", () => {
    const route: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-safe-test",
      proofMechanism:
        "Scenario-based creative using brand-owned visuals — customer proof if available.",
    };
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: [route],
    });
    expect(issues).toHaveLength(0);
  });
});

describe("quality regression – route simulation summaries", () => {
  it("derives summaries for all NODO mock routes", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    expect(summaries).toHaveLength(MOCK_ROUTES.length);
    for (const s of summaries) {
      expect(s.averageResonance).toBeGreaterThan(0);
      expect(s.decisionTakeaway.length).toBeGreaterThan(0);
    }
  });

  it("handles close scores correctly in decision summary", () => {
    const run = buildMockCampaignRun();
    // Force close scores
    const closeScores = run.scores.map((s, i) => ({
      ...s,
      weightedTotal: 3.5 - i * 0.05,
    }));

    const summary = buildDecisionSummary({
      routes: run.routes,
      scores: closeScores,
      comparison: run.comparisonMatrix,
      premortemReview: run.premortem,
    });

    expect(summary.closeScoreNotice).toBeDefined();
    expect(summary.closeScoreNotice).toContain("close");
  });
});

describe("quality regression – risk taxonomy classifies correctly", () => {
  it("classifies all NODO mock routes without error", () => {
    const run = buildMockCampaignRun();
    const taxonomy = deriveRiskTaxonomy({
      routes: run.routes,
      scores: run.scores,
      comparison: run.comparisonMatrix,
      premortemReview: run.premortem,
    });

    expect(taxonomy).toHaveLength(run.routes.length);
    for (const t of taxonomy) {
      expect(t.severity).toBeDefined();
      expect(t.primaryRiskType).toBeDefined();
      expect(t.explanation.length).toBeGreaterThan(0);
    }
  });

  it("a route with low feasibility score gets Execution risk classification", () => {
    const run = buildMockCampaignRun();
    const modifiedScores = run.scores.map((s) =>
      s.routeId === "route-between-addresses"
        ? { ...s, scores: { ...s.scores, feasibility: 2 }, weightedTotal: 2.5 }
        : s,
    );

    const taxonomy = deriveRiskTaxonomy({
      routes: run.routes,
      scores: modifiedScores,
      comparison: run.comparisonMatrix,
      premortemReview: run.premortem,
    });

    const entry = taxonomy.find((t) => t.routeId === "route-between-addresses");
    expect(entry?.primaryRiskType).toBe("Execution risk");
  });
});
