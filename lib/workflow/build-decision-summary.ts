// Deterministic decision summary derived from routes, scores, comparison, and premortem.
// No LLM calls. No probability claims. No invented evidence.

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

export type DecisionSummary = {
  recommendedRouteId: string;
  recommendedRouteName: string;
  whyItWins: string;
  runnerUpRouteId?: string;
  runnerUpStrength?: string;
  biggestTradeoff: string;
  closeScoreNotice?: string;
  riskType: RiskType;
};

const CLOSE_SCORE_THRESHOLD = 0.2;

function deriveRiskType(
  routeId: string,
  comparison: RouteComparisonMatrix,
  premortem: PremortemReview,
  routes: CampaignRoute[],
  scores: RouteScore[],
): RiskType {
  const row = comparison.rows.find((r) => r.routeId === routeId);
  const routeRisks = premortem.routeRisks.find((rr) => rr.routeId === routeId);
  const score = scores.find((s) => s.routeId === routeId);
  const route = routes.find((r) => r.id === routeId);

  const riskText = [
    ...(routeRisks?.risks ?? []),
    route?.failureMode ?? "",
    ...(row?.keyRisks ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (score && score.scores.feasibility <= 3) return "Execution risk";

  if (
    riskText.includes("testimonial") ||
    riskText.includes("proof") ||
    riskText.includes("evidence") ||
    riskText.includes("substantiation") ||
    riskText.includes("claim")
  )
    return "Proof risk";

  if (
    riskText.includes("conversion") ||
    riskText.includes("cta") ||
    riskText.includes("click") ||
    riskText.includes("purchase") ||
    riskText.includes("signup")
  )
    return "Conversion risk";

  if (
    riskText.includes("channel") ||
    riskText.includes("platform") ||
    riskText.includes("media") ||
    riskText.includes("distribution")
  )
    return "Channel risk";

  if (
    riskText.includes("generic") ||
    riskText.includes("bland") ||
    riskText.includes("dilut") ||
    riskText.includes("indistinguish") ||
    riskText.includes("catalog")
  )
    return "Brand dilution risk";

  if (row?.strategicRole === "boldest" || row?.riskLevel === "high") return "Creative risk";
  if (row?.riskLevel === "low") return "Execution risk";

  return "Creative risk";
}

function deriveWhyItWins(
  row: RouteComparisonMatrix["rows"][number],
  allRows: RouteComparisonMatrix["rows"],
  scores: RouteScore[],
): string {
  const score = scores.find((s) => s.routeId === row.routeId);
  const reasons: string[] = [];

  if (score) {
    if (score.scores.feasibility >= 4) reasons.push("stronger feasibility");
    if (score.scores.conversionPotential >= 4) reasons.push("clear conversion potential");
    if (score.scores.culturalRelevance >= 4) reasons.push("strong audience resonance");
    if (score.scores.distinctiveness >= 4) reasons.push("distinctive positioning");
    if (score.scores.riskAdjustedConfidence >= 4) reasons.push("lower risk-adjusted uncertainty");
  }

  if (reasons.length === 0) {
    if (row.feasibility >= 4) reasons.push("stronger feasibility");
    if (row.riskLevel === "low") reasons.push("lowest execution risk");
    if (row.audienceResonance >= 4) reasons.push("stronger audience resonance");
    if (row.conversionPotential >= 4) reasons.push("stronger conversion clarity");
  }

  if (reasons.length === 0) {
    return `Leads on balance across feasibility, resonance, and risk profile.`;
  }

  return `Leads because of ${reasons.slice(0, 3).join(", ")}.`;
}

function deriveRunnerUpStrength(
  recommendedRow: RouteComparisonMatrix["rows"][number],
  runnerUpRow: RouteComparisonMatrix["rows"][number],
): string {
  const dimensions: Array<[number, number, string]> = [
    [runnerUpRow.conversionPotential, recommendedRow.conversionPotential, "conversion clarity"],
    [runnerUpRow.audienceResonance, recommendedRow.audienceResonance, "audience resonance"],
    [runnerUpRow.feasibility, recommendedRow.feasibility, "execution feasibility"],
  ];

  const stronger = dimensions
    .filter(([ru, rec]) => ru > rec)
    .map(([, , label]) => label);

  if (stronger.length === 0) {
    return `${runnerUpRow.routeName} is competitive but does not exceed on any single measured dimension.`;
  }

  return `${runnerUpRow.routeName} is stronger on ${stronger.join(" and ")}.`;
}

function deriveBiggestTradeoff(
  row: RouteComparisonMatrix["rows"][number],
  routes: CampaignRoute[],
  scores: RouteScore[],
): string {
  const score = scores.find((s) => s.routeId === row.routeId);
  const route = routes.find((r) => r.id === row.routeId);

  if (score && score.scores.feasibility <= 3) {
    return "Execution complexity: this route requires strong production discipline to deliver on its creative premise.";
  }

  if (row.strategicRole === "boldest" || row.riskLevel === "high") {
    return "Higher creative ambition carries meaningful execution and cultural risk — strong copy and production are required.";
  }

  if (row.riskLevel === "low" && score && score.scores.distinctiveness <= 3) {
    return "Lower execution risk trades off against creative distinctiveness — the route may need sharper visual specificity to avoid generic premium territory.";
  }

  if (route?.strategicRole === "conversion" && score && score.scores.distinctiveness < score.scores.conversionPotential) {
    return "Product focus trades off against creative distinctiveness — copy discipline is required to prevent catalog drift.";
  }

  return "Balanced across dimensions — execution quality will determine whether the route lands or reads as familiar.";
}

export function buildDecisionSummary(input: {
  routes: CampaignRoute[];
  scores: RouteScore[];
  comparison: RouteComparisonMatrix;
  premortemReview: PremortemReview;
}): DecisionSummary {
  const { routes, scores, comparison, premortemReview } = input;

  const sortedScores = [...scores].sort((a, b) => b.weightedTotal - a.weightedTotal);
  const topScore = sortedScores[0];

  if (!topScore) {
    throw new Error("buildDecisionSummary: no scores provided.");
  }

  const recommendedId = comparison.recommendedRouteId;
  const recommendedRoute = routes.find((r) => r.id === recommendedId);
  const recommendedRow = comparison.rows.find((r) => r.routeId === recommendedId);

  if (!recommendedRoute || !recommendedRow) {
    throw new Error(
      `buildDecisionSummary: recommended route "${recommendedId}" not found in routes or comparison rows.`,
    );
  }

  const otherRows = comparison.rows.filter((r) => r.routeId !== recommendedId);
  const runnerUpRow = [...otherRows].sort((a, b) => b.weightedTotal - a.weightedTotal)[0];

  const topTwoScores = sortedScores.slice(0, 2);
  const scoreGap =
    topTwoScores.length >= 2 ? topTwoScores[0].weightedTotal - topTwoScores[1].weightedTotal : 1;

  const closeScoreNotice =
    scoreGap <= CLOSE_SCORE_THRESHOLD
      ? `Scores are strategically close (gap: ${scoreGap.toFixed(2)}). The recommendation reflects feasibility and risk profile, not a decisive quality gap.`
      : undefined;

  const whyItWins = deriveWhyItWins(recommendedRow, comparison.rows, scores);
  const biggestTradeoff = deriveBiggestTradeoff(recommendedRow, routes, scores);
  const riskType = deriveRiskType(recommendedId, comparison, premortemReview, routes, scores);

  const runnerUpRouteId = runnerUpRow?.routeId;
  const runnerUpStrength = runnerUpRow ? deriveRunnerUpStrength(recommendedRow, runnerUpRow) : undefined;

  return {
    recommendedRouteId: recommendedId,
    recommendedRouteName: recommendedRoute.name,
    whyItWins,
    runnerUpRouteId,
    runnerUpStrength,
    biggestTradeoff,
    closeScoreNotice,
    riskType,
  };
}
