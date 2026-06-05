import type { CampaignReport } from "@/lib/export/build-campaign-report";

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}\n`;
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function numbered(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function divider(): string {
  return "\n---\n";
}

function scoreBar(score: number | undefined): string {
  if (score == null) return "";
  return ` — **${score.toFixed(1)} / 5**`;
}

export function renderMarkdownReport(report: CampaignReport): string {
  const sections: string[] = [];

  // Title
  sections.push(`${heading(1, report.title)}`);
  sections.push(`_Generated: ${new Date(report.generatedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}_`);
  if (report.runId) sections.push(`_Run ID: ${report.runId}_`);
  sections.push("");

  // Caveat
  sections.push(`> **Planning document caveat:** ${report.caveat}`);
  sections.push("");

  // Executive Summary — table format
  sections.push(heading(2, "Executive Summary"));
  const summaryRows = [
    ["Brand", report.brandName],
    ["Campaign", report.capsuleDescription],
    ["Recommended route", report.recommendedRouteName],
  ];
  if (report.selectedRouteName) {
    summaryRows.push(["Selected route", report.selectedRouteName]);
  }
  summaryRows.push(["Budget", report.budgetLabel], ["Launch", report.timelineLabel]);
  sections.push("| Field | Value |");
  sections.push("| --- | --- |");
  for (const [field, value] of summaryRows) {
    sections.push(`| ${field} | ${value} |`);
  }
  sections.push("");

  divider();

  // Brief
  sections.push(divider());
  sections.push(heading(2, "Brief"));
  sections.push(heading(3, "Objectives"));
  sections.push(bullets(report.objectives));
  sections.push("");
  sections.push(heading(3, "Channels"));
  sections.push(bullets(report.channels));
  sections.push("");
  if (report.constraints.length > 0) {
    sections.push(heading(3, "Constraints"));
    sections.push(bullets(report.constraints));
    sections.push("");
  }

  // Strategic Tension
  sections.push(divider());
  sections.push(heading(2, "Strategic Tension"));
  sections.push(`> ${report.tensionStatement}`);
  sections.push("");
  sections.push(`**Audience desire:** ${report.audienceDesire}`);
  sections.push(`**Resistance:** ${report.audienceResistance}`);
  sections.push(`**Proof challenge:** ${report.brandProofChallenge}`);
  sections.push(`**Creative trap to avoid:** ${report.creativeTrap}`);
  sections.push(`**Creative opportunity:** ${report.creativeOpportunity}`);
  sections.push("");
  sections.push("**Avoid:**");
  sections.push(bullets(report.avoid));
  sections.push("");

  // Recommended Route
  sections.push(divider());
  sections.push(heading(2, "Recommended Route"));
  const recommendedRoute = report.routes.find((r) => r.id === report.recommendedRouteId);
  if (recommendedRoute) {
    sections.push(`### ${recommendedRoute.name}${scoreBar(recommendedRoute.score)}`);
    sections.push(`_${recommendedRoute.strategicRole} · ${recommendedRoute.rankingLabel ?? ""}_`);
    sections.push("");
    sections.push(`**Killer line:** ${recommendedRoute.killerLine}`);
    sections.push(`**Enemy:** ${recommendedRoute.enemy}`);
    sections.push("");
    if (recommendedRoute.keyStrengths.length > 0) {
      sections.push("**Strengths:**");
      sections.push(bullets(recommendedRoute.keyStrengths));
      sections.push("");
    }
    if (recommendedRoute.keyRisks.length > 0) {
      sections.push("**Risks:**");
      sections.push(bullets(recommendedRoute.keyRisks));
      sections.push("");
    }
  }
  sections.push(`**Why this route wins:** ${report.whyRecommendedWins}`);
  if (report.whereRunnerUpIsStronger) {
    sections.push(`**Where the runner-up is stronger:** ${report.whereRunnerUpIsStronger}`);
  }
  sections.push(`**Biggest tradeoff:** ${report.biggestTradeoff}`);
  sections.push("");

  // Selected Route (if different from recommended)
  if (report.selectedRouteId && report.selectedRouteId !== report.recommendedRouteId) {
    sections.push(divider());
    sections.push(heading(2, "Selected Route"));
    const selectedRoute = report.routes.find((r) => r.id === report.selectedRouteId);
    if (selectedRoute) {
      sections.push(`### ${selectedRoute.name}${scoreBar(selectedRoute.score)}`);
      sections.push(`_${selectedRoute.strategicRole}_`);
      sections.push(`**Killer line:** ${selectedRoute.killerLine}`);
      sections.push(`**Enemy:** ${selectedRoute.enemy}`);
      sections.push("");
    }
  } else if (report.selectedRouteId) {
    sections.push(divider());
    sections.push(heading(2, "Selected Route"));
    sections.push(`Human selection confirmed: **${report.selectedRouteName ?? report.selectedRouteId}** (same as recommended route).`);
    sections.push("");
  }

  // Route Comparison
  sections.push(divider());
  sections.push(heading(2, "Route Comparison"));
  for (const route of report.routes) {
    sections.push(`### ${route.name}${scoreBar(route.score)}`);
    sections.push(`_${route.strategicRole}${route.rankingLabel ? ` · ${route.rankingLabel}` : ""}_`);
    sections.push(`**Killer line:** ${route.killerLine}`);
    sections.push(`**Enemy:** ${route.enemy}`);
    if (route.keyStrengths.length > 0) {
      sections.push(`**Strengths:** ${route.keyStrengths.join("; ")}`);
    }
    if (route.keyRisks.length > 0) {
      sections.push(`**Key risks:** ${route.keyRisks.join("; ")}`);
    }
    sections.push("");
  }
  sections.push(heading(3, "Comparison notes"));
  sections.push(bullets(report.comparisonDecisionNotes));
  sections.push("");

  // Synthetic Audience Signals
  sections.push(divider());
  sections.push(heading(2, "Synthetic Audience Signals"));
  sections.push(`> **${report.syntheticCaveat}**`);
  sections.push("");
  for (const sim of report.simulations) {
    sections.push(`### ${sim.personaName} on ${sim.routeName}`);
    sections.push(`_Resonance: ${sim.resonanceScore.toFixed(1)} · Conversion: ${sim.conversionIntent.toFixed(1)}_`);
    sections.push(`**Reaction:** "${sim.quotedReaction}"`);
    sections.push(`**Understood message:** ${sim.understoodMessage}`);
    sections.push(`**Main objection:** ${sim.mainObjection}`);
    sections.push(`**Best CTA:** ${sim.bestCTA}`);
    sections.push("");
  }

  // Pre-mortem Risks
  sections.push(divider());
  sections.push(heading(2, "Pre-mortem Risks"));
  sections.push(report.premortemSummary);
  sections.push("");
  sections.push(heading(3, "Top failure risks"));
  for (const risk of report.topFailureRisks) {
    sections.push(`**${risk.risk}**`);
    sections.push(`- Why it happens: ${risk.whyItHappens}`);
    sections.push(`- Early warning sign: ${risk.earlyWarningSign}`);
    sections.push(`- Mitigation: ${risk.mitigation}`);
    sections.push(`- Affected team: ${risk.affectedTeam}`);
    sections.push("");
  }
  if (report.overallRisks.length > 0) {
    sections.push(heading(3, "Overall risks"));
    sections.push(bullets(report.overallRisks));
    sections.push("");
  }

  // Execution Plan
  if (report.executionPlan) {
    const plan = report.executionPlan;
    sections.push(divider());
    sections.push(heading(2, "Execution Plan"));
    sections.push(`## ${plan.planTitle}`);
    sections.push(plan.strategicSummary);
    sections.push("");

    sections.push(heading(3, "Assumptions"));
    sections.push(bullets(plan.assumptions));
    sections.push("");

    sections.push(heading(3, "Hero Visual System"));
    sections.push(plan.heroVisualSystem);
    sections.push("");

    sections.push(heading(3, "Shoot List"));
    sections.push(numbered(plan.shootList));
    sections.push("");

    sections.push(heading(3, "OOH Headlines"));
    for (const h of plan.oohHeadlines) {
      sections.push(`> **${h}**`);
      sections.push(">");
    }
    sections.push("");

    sections.push(heading(3, "Paid Social Hooks"));
    for (const hook of plan.paidSocialHooks) {
      sections.push(`> _"${hook}"_`);
      sections.push(">");
    }
    sections.push("");

    sections.push(heading(3, "Landing Page Structure"));
    for (const block of plan.landingPageBlocks) {
      sections.push(`**${block.block}**`);
      sections.push(`_${block.purpose}_`);
      sections.push(block.content);
      sections.push("");
    }

    sections.push(heading(3, "Launch Phases"));
    for (const phase of plan.launchPhases) {
      sections.push(`**${phase.phase}** · _${phase.timing}_`);
      sections.push(`${phase.objective}`);
      sections.push("");
      sections.push("Key actions:");
      sections.push(bullets(phase.keyActions));
      sections.push("Deliverables:");
      sections.push(bullets(phase.deliverables));
      sections.push("");
    }

    sections.push(heading(3, "Channel Plan"));
    for (const ch of plan.channelPlan) {
      sections.push(`**${ch.channel}** — ${ch.role}`);
      sections.push(bullets(ch.recommendedAssets));
      if (ch.notes) sections.push(`_${ch.notes}_`);
      sections.push("");
    }

    sections.push(heading(3, "Measurement Plan"));
    sections.push(
      plan.measurementPlan.map((m) => `- **${m.metric}**: ${m.purpose}`).join("\n"),
    );
    sections.push("");

    sections.push(heading(3, "Next Actions"));
    sections.push(numbered(plan.nextActions));
    sections.push("");
  }

  // Measurement Plan (if no execution plan but still want to show it)
  // (already included above)

  // Legal / Substantiation Notes
  if (report.executionPlan?.legalSubstantiationChecklist) {
    sections.push(divider());
    sections.push(heading(2, "Legal / Substantiation Notes"));
    sections.push(`> ${report.legalCaveat}`);
    sections.push("");
    sections.push("Claims requiring review before publication:");
    sections.push(bullets(report.executionPlan.legalSubstantiationChecklist));
    sections.push("");
  }

  // Trace Summary
  if (report.traceSummary && report.traceSummary.length > 0) {
    sections.push(divider());
    sections.push(heading(2, "Trace Summary"));
    sections.push(
      report.traceSummary
        .map((t) => `- **${t.stageId}** — ${t.status}${t.durationMs != null ? ` (${t.durationMs}ms)` : ""}`)
        .join("\n"),
    );
    sections.push("");
  }

  // Caveat footer
  sections.push(divider());
  sections.push(heading(2, "Caveat"));
  sections.push(report.caveat);
  sections.push("");
  sections.push(report.syntheticCaveat);
  sections.push("");
  sections.push(report.legalCaveat);
  sections.push("");
  sections.push("_This report was generated deterministically from structured workflow output. No LLM was used in report generation._");

  return sections.join("\n");
}
