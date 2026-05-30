// Pure deterministic comparison helper. No LLM calls, no env vars, no side effects.
// Assumes valid, fully-covered input: call validateSimulationCoverage,
// validateRouteScoreCoverage, and validatePremortemCoverage before invoking this.
// SAFETY: Comparison is decision-support (bounded 1–5 estimates), not a prediction.
// Human selection is required before final plan synthesis.

import type {
  CampaignRoute,
  PersonaSimulation,
  PremortemReview,
  RouteComparisonMatrix,
  RouteScore,
} from "@/lib/schemas/campaign";

function clamp15(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value * 10) / 10));
}

function riskLevelFromCount(count: number): "low" | "medium" | "high" {
  if (count <= 1) return "low";
  if (count <= 3) return "medium";
  return "high";
}

/**
 * Compare campaign routes using deterministic scoring signals.
 *
 * SAFETY: Output is a bounded qualitative decision-support matrix (1–5 per dimension).
 * Scores are strategic estimates, not predictions or market validation.
 * Human selection is required before generating an execution plan.
 *
 * Deterministic for the same input: no random, no I/O, no LLM.
 */
export function compareRoutes(input: {
  routes: CampaignRoute[];
  simulations: PersonaSimulation[];
  scores: RouteScore[];
  premortemReview: PremortemReview;
}): RouteComparisonMatrix {
  const { routes, simulations, scores, premortemReview } = input;

  const scoreMap = new Map(scores.map((s) => [s.routeId, s]));
  const riskMap = new Map(premortemReview.routeRisks.map((r) => [r.routeId, r]));

  const rows = routes.map((route) => {
    const score = scoreMap.get(route.id);
    const risk = riskMap.get(route.id);
    const routeSimulations = simulations.filter((s) => s.routeId === route.id);

    const weightedTotal = clamp15(score?.weightedTotal ?? 1);

    const avgResonance =
      routeSimulations.length > 0
        ? routeSimulations.reduce((sum, s) => sum + s.resonanceScore, 0) /
          routeSimulations.length
        : score?.scores.culturalRelevance ?? 3;

    const avgConversion =
      routeSimulations.length > 0
        ? routeSimulations.reduce((sum, s) => sum + s.conversionIntent, 0) /
          routeSimulations.length
        : score?.scores.conversionPotential ?? 3;

    const audienceResonance = clamp15(avgResonance);
    const conversionPotential = clamp15(avgConversion);
    const feasibility = clamp15(score?.scores.feasibility ?? 3);
    const riskCount = risk?.risks.length ?? 0;
    const level = riskLevelFromCount(riskCount);

    // Key strengths: first three unique positives across simulations,
    // or a role-level fallback if no simulations produced positives.
    const strengthSet = new Set<string>();
    for (const sim of routeSimulations) {
      for (const pos of sim.positives) {
        if (strengthSet.size < 3) strengthSet.add(pos);
      }
    }
    if (strengthSet.size === 0) {
      const roleStrength: Record<CampaignRoute["strategicRole"], string> = {
        safest: "Broad audience clarity and lower execution risk.",
        boldest: "Strong cultural point of view and brand differentiation.",
        conversion: "High conversion intent and direct response potential.",
      };
      strengthSet.add(roleStrength[route.strategicRole]);
    }
    const keyStrengths = [...strengthSet];

    // Key risks: up to three from premortem, falling back to route risks.
    const rawRisks = risk ? risk.risks : route.risks;
    const keyRisks =
      rawRisks.length > 0
        ? rawRisks.slice(0, 3)
        : ["Execution risk not assessed."];

    const roleRec: Record<CampaignRoute["strategicRole"], string> = {
      safest:
        "Best for teams prioritising broad reach and lower execution complexity.",
      boldest:
        "Best when cultural leadership and brand distinctiveness are the primary goal.",
      conversion:
        "Best when immediate sales conversion and list growth are the priority.",
    };
    const recommendation = roleRec[route.strategicRole];

    return {
      routeId: route.id,
      routeName: route.name,
      strategicRole: route.strategicRole,
      weightedTotal,
      audienceResonance,
      conversionPotential,
      feasibility,
      riskLevel: level,
      keyStrengths,
      keyRisks,
      recommendation,
    };
  });

  // Recommend the route with the highest weightedTotal.
  // If the top-ranked route has high risk and a runner-up is within 0.3 and not high-risk,
  // prefer the runner-up.
  const sorted = [...rows].sort((a, b) => b.weightedTotal - a.weightedTotal);
  let recommended = sorted[0];
  if (
    recommended.riskLevel === "high" &&
    sorted.length > 1 &&
    sorted[1].riskLevel !== "high" &&
    recommended.weightedTotal - sorted[1].weightedTotal <= 0.3
  ) {
    recommended = sorted[1];
  }

  const summary = `Comparison of ${routes.length} campaign routes across weighted scoring, audience resonance, conversion potential, feasibility, and strategic risk. Scores are bounded qualitative estimates (1–5) for decision support only.`;

  const decisionNotes = [
    "Route scores are strategic estimates, not predictions or market validation.",
    "Synthetic persona reactions are planning hypotheses and must not be presented as real customer research.",
    `Recommended route: ${recommended.routeName} (highest weighted total${recommended.riskLevel !== "high" ? " with manageable risk" : ""}).`,
    "Human selection is required before generating a final execution plan.",
  ];

  return {
    rows,
    recommendedRouteId: recommended.routeId,
    summary,
    decisionNotes,
  };
}
