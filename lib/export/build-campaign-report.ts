import type {
  CampaignExportInput,
  CampaignExecutionPlan,
  CampaignRoute,
  PersonaSimulation,
  RouteComparisonRow,
  RouteScore,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import {
  buildDecisionSummary,
  type DecisionSummary,
} from "@/lib/workflow/build-decision-summary";
import {
  deriveRouteSimulationSummaries,
  type RouteSimulationSummary,
} from "@/lib/workflow/derive-route-simulation-summaries";
import {
  deriveRiskTaxonomy,
  type RouteRiskTaxonomy,
} from "@/lib/workflow/derive-risk-taxonomy";

export interface CampaignReportRouteSummary {
  id: string;
  name: string;
  strategicRole: string;
  killerLine: string;
  enemy: string;
  keyStrengths: string[];
  keyRisks: string[];
  score?: number;
  scoreLabel?: string;
  rankingLabel?: string;
}

export interface CampaignReportSimulationSummary {
  personaName: string;
  routeName: string;
  quotedReaction: string;
  resonanceScore: number;
  conversionIntent: number;
  understoodMessage: string;
  mainObjection: string;
  bestCTA: string;
  caveat: string;
}

export interface CampaignReportTopRisk {
  risk: string;
  whyItHappens: string;
  earlyWarningSign: string;
  mitigation: string;
  affectedTeam: string;
}

export interface CampaignReportTraceSummary {
  stageId: string;
  status: string;
  durationMs?: number;
}

export interface CampaignReport {
  title: string;
  generatedAt: string;
  runId?: string;
  caveat: string;

  brandName: string;
  capsuleDescription: string;
  objectives: string[];
  budgetLabel: string;
  timelineLabel: string;
  channels: string[];
  constraints: string[];

  tensionStatement: string;
  audienceDesire: string;
  audienceResistance: string;
  brandProofChallenge: string;
  creativeTrap: string;
  creativeOpportunity: string;
  avoid: string[];

  routes: CampaignReportRouteSummary[];
  recommendedRouteId: string;
  recommendedRouteName: string;
  comparisonSummary: string;
  comparisonDecisionNotes: string[];
  whyRecommendedWins: string;
  whereRunnerUpIsStronger?: string;
  biggestTradeoff: string;

  // Decision cockpit — deterministic
  decisionSummary: DecisionSummary;

  // Risk taxonomy per route — deterministic
  riskTaxonomy: RouteRiskTaxonomy[];

  // Route-level simulation summaries — deterministic
  routeSimulationSummaries: RouteSimulationSummary[];

  selectedRouteId?: string;
  selectedRouteName?: string;

  simulations: CampaignReportSimulationSummary[];
  syntheticCaveat: string;

  topFailureRisks: CampaignReportTopRisk[];
  overallRisks: string[];
  premortemSummary: string;

  executionPlan?: {
    planTitle: string;
    strategicSummary: string;
    heroVisualSystem: string;
    shootList: string[];
    oohHeadlines: string[];
    paidSocialHooks: string[];
    landingPageBlocks: Array<{ block: string; purpose: string; content: string }>;
    legalSubstantiationChecklist: string[];
    launchPhases: CampaignExecutionPlan["launchPhases"];
    channelPlan: CampaignExecutionPlan["channelPlan"];
    measurementPlan: CampaignExecutionPlan["measurementPlan"];
    nextActions: string[];
    assumptions: string[];
  };

  traceSummary?: CampaignReportTraceSummary[];
  legalCaveat: string;
}

function rankingLabel(
  routeId: string,
  scores: RouteScore[],
  rows: RouteComparisonRow[],
): string | undefined {
  const sorted = [...scores].sort((a, b) => b.weightedTotal - a.weightedTotal);
  if (sorted[0]?.routeId === routeId) return "Strongest overall";

  const byResonance = [...scores].sort((a, b) => b.scores.culturalRelevance - a.scores.culturalRelevance);
  if (byResonance[0]?.routeId === routeId) return "Best resonance";

  const byConversion = [...scores].sort((a, b) => b.scores.conversionPotential - a.scores.conversionPotential);
  if (byConversion[0]?.routeId === routeId) return "Best conversion";

  const byFeasibility = [...scores].sort((a, b) => b.scores.feasibility - a.scores.feasibility);
  if (byFeasibility[0]?.routeId === routeId) return "Lowest risk";

  const row = rows.find((r) => r.routeId === routeId);
  if (row?.riskLevel === "low") return "Safest execution";
  if (row?.riskLevel === "high") return "Highest creative risk";
  return undefined;
}

function comparisonWinExplanation(
  recommendedRow: RouteComparisonRow,
  rows: RouteComparisonRow[],
): { whyWins: string; whereRunnerUpStronger?: string; biggestTradeoff: string } {
  const others = rows.filter((r) => r.routeId !== recommendedRow.routeId);
  const runnerUp = [...others].sort((a, b) => b.weightedTotal - a.weightedTotal)[0];

  const isClose = runnerUp && recommendedRow.weightedTotal - runnerUp.weightedTotal <= 0.2;

  const winReasons: string[] = [];
  if (recommendedRow.feasibility >= 4) winReasons.push("stronger feasibility");
  if (recommendedRow.riskLevel === "low") winReasons.push("lower execution risk");
  if (recommendedRow.audienceResonance >= 4) winReasons.push("stronger audience resonance");
  if (recommendedRow.conversionPotential >= 4) winReasons.push("stronger conversion clarity");

  const whyWins = winReasons.length > 0
    ? `Recommended because of ${winReasons.join(", ")}.${isClose ? " Scores are strategically close — the margin reflects execution risk, not a significant quality gap." : ""}`
    : `Recommended on balance across feasibility, resonance, and risk profile.${isClose ? " Scores are strategically close." : ""}`;

  const whereRunnerUpStronger = runnerUp
    ? `${runnerUp.routeName} scores higher on ${runnerUp.conversionPotential > recommendedRow.conversionPotential ? "conversion potential" : runnerUp.audienceResonance > recommendedRow.audienceResonance ? "audience resonance" : "creative distinctiveness"}.`
    : undefined;

  const biggestTradeoff = recommendedRow.riskLevel === "low"
    ? "Lower execution risk trades off against creative distinctiveness."
    : recommendedRow.riskLevel === "high"
      ? "Higher creative ambition carries meaningful execution and cultural risk."
      : "Balanced across dimensions — no single tradeoff dominates.";

  return { whyWins, whereRunnerUpStronger, biggestTradeoff };
}

function formatBudget(budget: CampaignExportInput["normalizedBrief"]["budget"]): string {
  if (!budget) return "Not specified";
  if (budget.label) return budget.label;
  const min = budget.min ?? null;
  const max = budget.max ?? null;
  if (min !== null && max !== null) {
    const prefix = budget.currency ? `${budget.currency} ` : "";
    return `${prefix}${min.toLocaleString()}–${max.toLocaleString()}`;
  }
  return "Not specified";
}

function simulationSummaries(
  simulations: PersonaSimulation[],
  input: CampaignExportInput,
): CampaignReportSimulationSummary[] {
  return simulations.map((sim) => {
    const persona = input.personas.find((p) => p.id === sim.personaId);
    const route = input.routes.find((r) => r.id === sim.routeId);
    return {
      personaName: persona?.name ?? sim.personaId,
      routeName: route?.name ?? sim.routeId,
      quotedReaction: sim.quotedReaction,
      resonanceScore: sim.resonanceScore,
      conversionIntent: sim.conversionIntent,
      understoodMessage: sim.understoodMessage,
      mainObjection: sim.mainObjection,
      bestCTA: sim.bestCTA,
      caveat: sim.caveat,
    };
  });
}

function traceSummaries(events: TraceEvent[]): CampaignReportTraceSummary[] {
  return events.map((e) => ({
    stageId: e.stageId,
    status: e.status,
    durationMs: e.durationMs,
  }));
}

export function buildCampaignReport(input: CampaignExportInput): CampaignReport {
  const { normalizedBrief, strategicTension, routes, scores, comparison, premortemReview, selectedRouteId, executionPlan, traceEvents } = input;

  const routeMap = new Map(routes.map((r) => [r.id, r]));
  const scoreMap = new Map(scores.map((s) => [s.routeId, s]));
  const rowMap = new Map(comparison.rows.map((r) => [r.routeId, r]));

  const recommendedRow = rowMap.get(comparison.recommendedRouteId) ?? comparison.rows[0];
  const { whyWins, whereRunnerUpStronger, biggestTradeoff } = comparisonWinExplanation(
    recommendedRow,
    comparison.rows,
  );

  const decisionSummary = buildDecisionSummary({ routes, scores, comparison, premortemReview });
  const riskTaxonomy = deriveRiskTaxonomy({ routes, scores, comparison, premortemReview });
  const routeSimulationSummaries = deriveRouteSimulationSummaries({
    routes,
    personas: input.personas,
    simulations: input.simulations,
  });

  const routeSummaries: CampaignReportRouteSummary[] = routes.map((route) => {
    const score = scoreMap.get(route.id);
    const row = rowMap.get(route.id);
    return {
      id: route.id,
      name: route.name,
      strategicRole: route.strategicRole,
      killerLine: route.killerLine,
      enemy: route.enemy,
      keyStrengths: row?.keyStrengths ?? [],
      keyRisks: row?.keyRisks ?? [],
      score: score?.weightedTotal,
      rankingLabel: rankingLabel(route.id, scores, comparison.rows),
    };
  });

  const selectedRoute = selectedRouteId ? routeMap.get(selectedRouteId) : undefined;

  const planSummary = executionPlan
    ? {
        planTitle: executionPlan.planTitle,
        strategicSummary: executionPlan.strategicSummary,
        heroVisualSystem: executionPlan.heroVisualSystem,
        shootList: executionPlan.shootList,
        oohHeadlines: executionPlan.oohHeadlines,
        paidSocialHooks: executionPlan.paidSocialHooks,
        landingPageBlocks: executionPlan.landingPageBlocks,
        legalSubstantiationChecklist: executionPlan.legalSubstantiationChecklist,
        launchPhases: executionPlan.launchPhases,
        channelPlan: executionPlan.channelPlan,
        measurementPlan: executionPlan.measurementPlan,
        nextActions: executionPlan.nextActions,
        assumptions: executionPlan.assumptions,
      }
    : undefined;

  return {
    title: `Campaign Strategy Report — ${normalizedBrief.brandName}`,
    generatedAt: new Date().toISOString(),
    runId: input.runId,
    caveat:
      "This report is a strategic planning document. It contains synthetic audience simulations, bounded qualitative route scores, and deterministic comparisons. None of these constitute real market research, validated customer evidence, or performance predictions. Human judgment is required at every decision point.",

    brandName: normalizedBrief.brandName,
    capsuleDescription: normalizedBrief.capsuleDescription,
    objectives: normalizedBrief.objectives,
    budgetLabel: formatBudget(normalizedBrief.budget),
    timelineLabel: normalizedBrief.timeline.launchWindow,
    channels: normalizedBrief.channels,
    constraints: normalizedBrief.constraints,

    tensionStatement: strategicTension.tensionStatement,
    audienceDesire: strategicTension.audienceDesire,
    audienceResistance: strategicTension.audienceResistance,
    brandProofChallenge: strategicTension.brandProofChallenge,
    creativeTrap: strategicTension.creativeTrap,
    creativeOpportunity: strategicTension.creativeOpportunity,
    avoid: strategicTension.avoid,

    routes: routeSummaries,
    recommendedRouteId: comparison.recommendedRouteId,
    recommendedRouteName: routeMap.get(comparison.recommendedRouteId)?.name ?? comparison.recommendedRouteId,
    comparisonSummary: comparison.summary,
    comparisonDecisionNotes: comparison.decisionNotes,
    whyRecommendedWins: whyWins,
    whereRunnerUpIsStronger: whereRunnerUpStronger,
    biggestTradeoff,

    decisionSummary,
    riskTaxonomy,
    routeSimulationSummaries,

    selectedRouteId,
    selectedRouteName: selectedRoute?.name,

    simulations: simulationSummaries(input.simulations, input),
    syntheticCaveat:
      "All audience simulations are synthetic planning hypotheses generated for decision support. They are not real audience research, survey data, focus group findings, or market validation. Do not present them as evidence of actual customer behavior.",

    topFailureRisks: premortemReview.topFailureRisks,
    overallRisks: premortemReview.overallRisks,
    premortemSummary: premortemReview.summary,

    executionPlan: planSummary,

    traceSummary: traceEvents ? traceSummaries(traceEvents) : undefined,
    legalCaveat:
      "Claims touching time, sustainability, savings, behavior change, or health/wellness require legal and substantiation review before publication. The legal/substantiation checklist in the execution plan section identifies the specific claims requiring review.",
  };
}
