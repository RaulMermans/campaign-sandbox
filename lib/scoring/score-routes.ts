// Pure deterministic scoring helper. No LLM calls, no env vars, no side effects.
// Assumes valid, fully-covered input: call validateSimulationCoverage and
// validateRouteScoreCoverage at the stage level before and after invoking this.
// Scores are bounded qualitative strategic estimates (1–5), not probabilities or predictions.
import type { CampaignRoute, PersonaSimulation, RouteScore } from "@/lib/schemas/campaign";

const roleDefaults: Record<CampaignRoute["strategicRole"], Omit<RouteScore["scores"], "riskAdjustedConfidence">> = {
  safest: {
    clarity: 4.5,
    distinctiveness: 3.4,
    feasibility: 4.6,
    conversionPotential: 4,
    culturalRelevance: 3.7,
    brandFit: 4.5,
  },
  boldest: {
    clarity: 3.7,
    distinctiveness: 4.8,
    feasibility: 3.3,
    conversionPotential: 3.5,
    culturalRelevance: 4.7,
    brandFit: 4.1,
  },
  conversion: {
    clarity: 4.2,
    distinctiveness: 3.9,
    feasibility: 4.1,
    conversionPotential: 4.6,
    culturalRelevance: 4,
    brandFit: 4.2,
  },
};

const weights: RouteScore["scores"] = {
  clarity: 0.14,
  distinctiveness: 0.16,
  feasibility: 0.14,
  conversionPotential: 0.18,
  culturalRelevance: 0.16,
  brandFit: 0.14,
  riskAdjustedConfidence: 0.08,
};

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number) {
  return Math.max(1, Math.min(5, roundScore(value)));
}

export function scoreRoutes(routes: CampaignRoute[], simulations: PersonaSimulation[]): RouteScore[] {
  return routes.map((route) => {
    const routeSimulations = simulations.filter((simulation) => simulation.routeId === route.id);
    const averageResonance =
      routeSimulations.reduce((sum, simulation) => sum + simulation.resonanceScore, 0) /
      Math.max(routeSimulations.length, 1);
    const averageIntent =
      routeSimulations.reduce((sum, simulation) => sum + simulation.conversionIntent, 0) /
      Math.max(routeSimulations.length, 1);
    const objections = routeSimulations.reduce(
      (sum, simulation) => sum + simulation.objections.length,
      route.risks.length,
    );

    const base = roleDefaults[route.strategicRole];
    const scores: RouteScore["scores"] = {
      clarity: clampScore(base.clarity),
      distinctiveness: clampScore(base.distinctiveness),
      feasibility: clampScore(base.feasibility - Math.max(0, route.risks.length - 2) * 0.15),
      conversionPotential: clampScore((base.conversionPotential + averageIntent) / 2),
      culturalRelevance: clampScore((base.culturalRelevance + averageResonance) / 2),
      brandFit: clampScore(base.brandFit),
      riskAdjustedConfidence: clampScore(4.8 - objections * 0.18),
    };

    const weightedTotal = clampScore(
      Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + scores[key as keyof RouteScore["scores"]] * weight;
      }, 0),
    );

    return {
      routeId: route.id,
      label: `${route.name} strategic estimate`,
      scores,
      weightedTotal,
      rationale:
        "Strategic estimate based on route role, feasibility, synthetic persona response, and visible execution risk.",
    };
  });
}
