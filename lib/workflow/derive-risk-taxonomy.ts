// Deterministic risk taxonomy derivation.
// Classifies each route's risk type and severity from scores, comparison rows,
// premortem data, and route fields.
// No LLM calls.

import type {
  CampaignRoute,
  RouteScore,
  RouteComparisonMatrix,
  PremortemReview,
} from "@/lib/schemas/campaign";

export type RiskType =
  | "Creative risk"
  | "Proof risk"
  | "Conversion risk"
  | "Channel risk"
  | "Execution risk"
  | "Brand dilution risk";

export type RiskSeverity = "Low" | "Moderate" | "High";

export type RouteRiskTaxonomy = {
  routeId: string;
  severity: RiskSeverity;
  primaryRiskType: RiskType;
  explanation: string;
};

function classifyRiskType(
  route: CampaignRoute,
  score: RouteScore | undefined,
  comparisonRow: RouteComparisonMatrix["rows"][number] | undefined,
  routeRisks: string[],
): { type: RiskType; explanation: string } {
  const riskText = [...routeRisks, route.failureMode, ...(comparisonRow?.keyRisks ?? [])]
    .join(" ")
    .toLowerCase();

  // Proof risk: vague proof mechanism or unsupported testimonial claims
  if (
    riskText.includes("proof") ||
    riskText.includes("testimonial") ||
    riskText.includes("evidence") ||
    riskText.includes("substantiat") ||
    riskText.includes("claim")
  ) {
    return {
      type: "Proof risk",
      explanation: "The route relies on proof claims that may lack substantiation. Evidence must be confirmed before production.",
    };
  }

  // Execution risk: low feasibility score
  if (score && score.scores.feasibility <= 3) {
    return {
      type: "Execution risk",
      explanation: `Feasibility score is ${score.scores.feasibility.toFixed(1)}/5, indicating meaningful execution complexity or resource requirements.`,
    };
  }

  // Conversion risk: high distinctiveness but low conversion potential
  if (
    score &&
    score.scores.distinctiveness >= 4 &&
    score.scores.conversionPotential <= 3
  ) {
    return {
      type: "Conversion risk",
      explanation: "High distinctiveness paired with lower conversion potential — creative ambition may come at the cost of clear commercial action.",
    };
  }

  // Brand dilution risk: generic positioning signals
  if (
    riskText.includes("generic") ||
    riskText.includes("bland") ||
    riskText.includes("indistinguish") ||
    riskText.includes("catalog") ||
    riskText.includes("dilut") ||
    (score && score.scores.distinctiveness <= 2)
  ) {
    return {
      type: "Brand dilution risk",
      explanation: "Route may drift into generic premium territory without stronger visual or copy specificity.",
    };
  }

  // Channel risk: execution depends on channel fit issues
  if (
    riskText.includes("channel") ||
    riskText.includes("platform") ||
    riskText.includes("format") ||
    riskText.includes("distribution")
  ) {
    return {
      type: "Channel risk",
      explanation: "Route effectiveness depends on specific channel execution — weaker fit on secondary platforms may reduce reach.",
    };
  }

  // Creative risk: boldest role or high risk level
  if (
    comparisonRow?.riskLevel === "high" ||
    route.strategicRole === "boldest"
  ) {
    return {
      type: "Creative risk",
      explanation: "Bold creative territory with higher creative risk — execution and cultural tone require careful calibration.",
    };
  }

  // Default: creative risk for ambiguous cases
  return {
    type: "Creative risk",
    explanation: "General creative uncertainty — execution quality and brief alignment will determine whether the route lands as intended.",
  };
}

function deriveSeverity(
  score: RouteScore | undefined,
  comparisonRow: RouteComparisonMatrix["rows"][number] | undefined,
): RiskSeverity {
  if (comparisonRow?.riskLevel === "high") return "High";
  if (comparisonRow?.riskLevel === "low") return "Low";
  if (score && score.scores.riskAdjustedConfidence >= 4) return "Low";
  if (score && score.scores.riskAdjustedConfidence <= 2) return "High";
  return "Moderate";
}

export function deriveRiskTaxonomy(input: {
  routes: CampaignRoute[];
  scores: RouteScore[];
  comparison: RouteComparisonMatrix;
  premortemReview: PremortemReview;
}): RouteRiskTaxonomy[] {
  const { routes, scores, comparison, premortemReview } = input;

  const scoreMap = new Map(scores.map((s) => [s.routeId, s]));
  const rowMap = new Map(comparison.rows.map((r) => [r.routeId, r]));
  const riskMap = new Map(
    premortemReview.routeRisks.map((rr) => [rr.routeId, rr.risks]),
  );

  return routes.map((route) => {
    const score = scoreMap.get(route.id);
    const comparisonRow = rowMap.get(route.id);
    const routeRisks = riskMap.get(route.id) ?? [];

    const severity = deriveSeverity(score, comparisonRow);
    const { type: primaryRiskType, explanation } = classifyRiskType(
      route,
      score,
      comparisonRow,
      routeRisks,
    );

    return {
      routeId: route.id,
      severity,
      primaryRiskType,
      explanation,
    };
  });
}
