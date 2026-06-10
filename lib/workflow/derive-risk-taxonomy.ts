// Deterministic risk taxonomy derivation.
// Classifies each route's primary (and, where signals differ, secondary) risk
// type and severity from scores, comparison rows, premortem data, and route
// fields. No LLM calls.

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
  | "Brand dilution risk"
  | "Audience risk"
  | "Cultural risk";

export type RiskSeverity = "Low" | "Moderate" | "High";

export type RouteRiskTaxonomy = {
  routeId: string;
  severity: RiskSeverity;
  primaryRiskType: RiskType;
  explanation: string;
  secondaryRiskType?: RiskType;
  secondaryExplanation?: string;
};

type RiskCandidate = {
  type: RiskType;
  explanation: string;
  /** Relative strength of the signal — higher wins. Only candidates with
   * strength > 0 are eligible to surface as a secondary risk. */
  strength: number;
};

// Tie-break order applied when two candidates have equal strength. Mirrors
// the signal categories called out for differentiation: feasibility,
// conversion, genericity (brand dilution), channel fit, and proof language —
// followed by the broader audience/cultural/creative categories.
const TIE_BREAK_ORDER: RiskType[] = [
  "Execution risk",
  "Conversion risk",
  "Brand dilution risk",
  "Channel risk",
  "Proof risk",
  "Audience risk",
  "Cultural risk",
  "Creative risk",
];

function tieBreakRank(type: RiskType): number {
  const idx = TIE_BREAK_ORDER.indexOf(type);
  return idx === -1 ? TIE_BREAK_ORDER.length : idx;
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function buildRiskCandidates(
  route: CampaignRoute,
  score: RouteScore | undefined,
  comparisonRow: RouteComparisonMatrix["rows"][number] | undefined,
  routeRisks: string[],
): RiskCandidate[] {
  const riskText = [...routeRisks, route.failureMode, ...(comparisonRow?.keyRisks ?? [])]
    .join(" ")
    .toLowerCase();

  const candidates: RiskCandidate[] = [];

  // Proof risk: vague proof mechanism or unsupported testimonial claims.
  const proofMatches = countMatches(riskText, [
    "proof",
    "testimonial",
    "evidence",
    "substantiat",
    "claim",
  ]);
  if (proofMatches > 0) {
    candidates.push({
      type: "Proof risk",
      strength: proofMatches,
      explanation:
        "The route relies on proof claims that may lack substantiation. Evidence must be confirmed before production.",
    });
  }

  // Execution risk: low feasibility score — strength scales with the shortfall.
  if (score && score.scores.feasibility <= 3) {
    candidates.push({
      type: "Execution risk",
      strength: 5 - score.scores.feasibility,
      explanation: `Feasibility score is ${score.scores.feasibility.toFixed(1)}/5, indicating meaningful execution complexity or resource requirements.`,
    });
  }

  // Conversion risk: high distinctiveness but low conversion potential —
  // strength scales with the size of the gap between the two.
  if (score && score.scores.distinctiveness >= 4 && score.scores.conversionPotential <= 3) {
    candidates.push({
      type: "Conversion risk",
      strength: score.scores.distinctiveness - score.scores.conversionPotential,
      explanation:
        "High distinctiveness paired with lower conversion potential — creative ambition may come at the cost of clear commercial action.",
    });
  }

  // Brand dilution risk: generic positioning signals in language or scoring.
  const genericMatches = countMatches(riskText, [
    "generic",
    "bland",
    "indistinguish",
    "catalog",
    "dilut",
  ]);
  const lowDistinctiveness = score ? score.scores.distinctiveness <= 2 : false;
  if (genericMatches > 0 || lowDistinctiveness) {
    candidates.push({
      type: "Brand dilution risk",
      strength: genericMatches + (lowDistinctiveness ? 2 : 0),
      explanation:
        "Route may drift into generic premium territory without stronger visual or copy specificity.",
    });
  }

  // Channel risk: execution depends on channel- or format-fit issues.
  const channelMatches = countMatches(riskText, ["channel", "platform", "format", "distribution"]);
  if (channelMatches > 0) {
    candidates.push({
      type: "Channel risk",
      strength: channelMatches,
      explanation:
        "Route effectiveness depends on specific channel execution — weaker fit on secondary platforms may reduce reach.",
    });
  }

  // Audience risk: signals that the route may not land with the intended segment.
  const audienceMatches = countMatches(riskText, [
    "audience",
    "resonate",
    "relevan",
    "demographic",
    "segment",
    "niche",
    "narrow appeal",
  ]);
  if (audienceMatches > 0) {
    candidates.push({
      type: "Audience risk",
      strength: audienceMatches,
      explanation:
        "Route language signals doubt about whether the intended audience will see themselves in it — segment fit should be checked before committing budget.",
    });
  }

  // Cultural risk: sensitivity, tone, or context concerns — kept narrow and
  // specific so generic uses of "cultural" (e.g. "cultural project") don't
  // produce false positives.
  const culturalMatches = countMatches(riskText, [
    "cultural sensitiv",
    "cultural appropriat",
    "stereotype",
    "controvers",
    "offens",
    "tone-deaf",
    "tone deaf",
    "insensitiv",
    "alienat",
  ]);
  if (culturalMatches > 0) {
    candidates.push({
      type: "Cultural risk",
      strength: culturalMatches,
      explanation:
        "Route language flags potential tone or sensitivity concerns — review against the brief's stated audience sensitivities before production.",
    });
  }

  // Creative risk: bold creative territory or elevated comparison risk level.
  // Always present as the deterministic fallback so every route classifies.
  const isBoldOrHighRisk = comparisonRow?.riskLevel === "high" || route.strategicRole === "boldest";
  candidates.push({
    type: "Creative risk",
    strength: isBoldOrHighRisk ? 1 : 0,
    explanation: isBoldOrHighRisk
      ? "Bold creative territory with higher creative risk — execution and cultural tone require careful calibration."
      : "General creative uncertainty — execution quality and brief alignment will determine whether the route lands as intended.",
  });

  return candidates;
}

function rankCandidates(candidates: RiskCandidate[]): RiskCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return tieBreakRank(a.type) - tieBreakRank(b.type);
  });
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
  const riskMap = new Map(premortemReview.routeRisks.map((rr) => [rr.routeId, rr.risks]));

  return routes.map((route) => {
    const score = scoreMap.get(route.id);
    const comparisonRow = rowMap.get(route.id);
    const routeRisks = riskMap.get(route.id) ?? [];

    const severity = deriveSeverity(score, comparisonRow);
    const ranked = rankCandidates(buildRiskCandidates(route, score, comparisonRow, routeRisks));

    const primary = ranked[0]!;
    const secondary = ranked.find((c) => c.type !== primary.type && c.strength > 0);

    return {
      routeId: route.id,
      severity,
      primaryRiskType: primary.type,
      explanation: primary.explanation,
      ...(secondary
        ? { secondaryRiskType: secondary.type, secondaryExplanation: secondary.explanation }
        : {}),
    };
  });
}
