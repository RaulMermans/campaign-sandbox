import type { CampaignReport } from "@/lib/export/build-campaign-report";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function section(title: string, content: string): string {
  return `<section class="section">
  <h2>${esc(title)}</h2>
  ${content}
</section>`;
}

function subsection(title: string, content: string): string {
  return `<div class="subsection">
  <h3>${esc(title)}</h3>
  ${content}
</div>`;
}

function ul(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function ol(items: string[]): string {
  if (items.length === 0) return "";
  return `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
}

function kv(label: string, value: string): string {
  return `<p><span class="label">${esc(label)}</span> ${esc(value)}</p>`;
}

function scoreBar(score: number | undefined): string {
  if (score == null) return "";
  return `<span class="score">${score.toFixed(1)} / 5</span>`;
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: #1c1c1c;
    background: #fff;
    max-width: 860px;
    margin: 0 auto;
    padding: 0 24px 80px;
  }
  .report-cover {
    padding: 48px 0 40px;
    border-bottom: 2px solid #111;
    margin-bottom: 2.5rem;
  }
  .report-cover .brand-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #888;
    margin-bottom: 0.5rem;
  }
  .report-cover h1 { font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem; line-height: 1.2; }
  .report-cover .meta { font-size: 0.8rem; color: #888; margin-top: 1rem; }
  .report-cover .selected-route-callout {
    display: inline-block;
    background: #111;
    color: #fff;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 1rem;
  }
  h2 { font-size: 1.15rem; font-weight: 700; margin: 2.5rem 0 0.75rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.4rem; }
  h3 { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
  p { margin: 0.4rem 0; }
  ul, ol { margin: 0.5rem 0 0.5rem 1.5rem; padding: 0; }
  li { margin-bottom: 0.25rem; }
  .meta { font-size: 0.8rem; color: #888; margin-bottom: 1rem; }
  .caveat-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 0.8rem;
    color: #78350f;
    margin: 1rem 0;
  }
  .section { margin-bottom: 2rem; }
  .subsection { margin-bottom: 1.5rem; }
  .label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; display: block; margin-top: 0.75rem; }
  .score { display: inline-block; background: #f5f5f5; border-radius: 4px; padding: 1px 8px; font-size: 0.9rem; font-weight: 600; margin-left: 8px; }
  .role-badge { display: inline-block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 4px; padding: 2px 8px; margin-right: 4px; }
  .role-safest { background: #dcfce7; color: #166534; }
  .role-boldest { background: #f3e8ff; color: #6b21a8; }
  .role-conversion { background: #dbeafe; color: #1e40af; }
  .ranking-label { font-size: 0.75rem; color: #888; margin-left: 4px; }
  .killer-line { font-size: 1.05rem; font-weight: 600; color: #111; margin: 0.5rem 0; }
  .tension-statement { background: #f9fafb; border-left: 3px solid #d1d5db; padding: 12px 16px; margin: 0.75rem 0; font-size: 0.95rem; }
  .ooh-line { display: block; background: #111; color: #fff; padding: 12px 18px; border-radius: 6px; margin-bottom: 10px; font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; }
  .social-hook { display: block; border: 1px solid #e5e5e5; padding: 10px 16px; border-radius: 6px; margin-bottom: 8px; font-style: italic; }
  .landing-block { border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px; margin-bottom: 10px; }
  .landing-block .block-name { font-weight: 600; font-size: 0.95rem; }
  .landing-block .block-purpose { font-size: 0.8rem; color: #888; display: block; margin-bottom: 4px; }
  .risk-card { border: 1px solid #fde68a; background: #fffbeb; border-radius: 6px; padding: 14px; margin-bottom: 10px; break-inside: avoid; }
  .risk-card .risk-headline { font-weight: 600; margin-bottom: 6px; }
  .sim-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px; margin-bottom: 10px; break-inside: avoid; }
  .sim-card .quoted { font-style: italic; margin: 6px 0; color: #444; }
  .sim-scores { display: flex; gap: 12px; font-size: 0.8rem; color: #888; margin: 4px 0 8px; }
  .legal-note { background: #f5f5f5; border-radius: 6px; padding: 12px 16px; font-size: 0.8rem; }
  .selected-callout { border: 2px solid #111; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .selected-callout .selected-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .footer-caveat { border-top: 1px solid #e5e5e5; margin-top: 3rem; padding-top: 1rem; font-size: 0.75rem; color: #999; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.5rem 0 1rem; }
  .summary-table td { padding: 6px 0; vertical-align: top; }
  .summary-table td:first-child { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; width: 140px; padding-right: 12px; }
  @media print {
    body { padding: 0 20px; max-width: 100%; font-size: 13px; }
    .report-cover { padding: 32px 0 28px; page-break-after: always; }
    h2 { page-break-before: always; margin-top: 0; }
    h2:first-of-type { page-break-before: auto; }
    .section { page-break-inside: avoid; }
    .risk-card, .sim-card, .landing-block { break-inside: avoid; }
    .caveat-box { break-inside: avoid; }
  }
`;

export function renderHtmlReport(report: CampaignReport): string {
  const parts: string[] = [];

  // Document open
  parts.push(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(report.title)}</title>
<style>${CSS}</style>
</head>
<body>`);

  // Cover
  parts.push(`<header class="report-cover">
  <p class="brand-label">${esc(report.brandName)} · Campaign Sandbox Report</p>
  <h1>${esc(report.title)}</h1>
  ${report.selectedRouteName ? `<div class="selected-route-callout">Selected route: ${esc(report.selectedRouteName)}</div>` : ""}
  <p class="meta">Generated: ${esc(new Date(report.generatedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }))}${report.runId ? ` · Run ${esc(report.runId)}` : ""}</p>
  <div class="caveat-box">${esc(report.caveat)}</div>
</header>`);

  // Executive Summary — table
  const summaryRows = [
    ["Brand", report.brandName],
    ["Campaign", report.capsuleDescription],
    ["Recommended route", report.recommendedRouteName],
    ...(report.selectedRouteName ? [["Selected route", report.selectedRouteName]] : []),
    ["Budget", report.budgetLabel],
    ["Launch", report.timelineLabel],
  ];
  const summaryTable = `<table class="summary-table"><tbody>
    ${summaryRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("\n    ")}
  </tbody></table>`;
  parts.push(section("Executive Summary", summaryTable));

  // Brief
  parts.push(section("Brief", `
    ${subsection("Objectives", ul(report.objectives))}
    ${subsection("Channels", ul(report.channels))}
    ${report.constraints.length > 0 ? subsection("Constraints", ul(report.constraints)) : ""}
  `));

  // Strategic Tension
  parts.push(section("Strategic Tension", `
    <div class="tension-statement">${esc(report.tensionStatement)}</div>
    ${kv("Audience desire", report.audienceDesire)}
    ${kv("Resistance", report.audienceResistance)}
    ${kv("Proof challenge", report.brandProofChallenge)}
    ${kv("Creative trap to avoid", report.creativeTrap)}
    ${kv("Creative opportunity", report.creativeOpportunity)}
    ${subsection("Avoid", ul(report.avoid))}
  `));

  // Decision Summary — cockpit view
  const ds = report.decisionSummary;
  const decisionRows = [
    ["Recommended route", ds.recommendedRouteName],
    ["Why it leads", ds.whyItWins],
    ...(ds.runnerUpStrength ? [["Runner-up strength", ds.runnerUpStrength]] : []),
    ["Biggest tradeoff", ds.biggestTradeoff],
    ["Primary risk type", ds.riskType],
    ...(ds.closeScoreNotice ? [["Score note", ds.closeScoreNotice]] : []),
  ];
  const decisionTable = `<table class="summary-table"><tbody>
    ${decisionRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("\n    ")}
  </tbody></table>`;
  parts.push(section("Decision Summary", decisionTable));

  // Recommended Route
  const recommendedRoute = report.routes.find((r) => r.id === report.recommendedRouteId);
  if (recommendedRoute) {
    parts.push(section("Recommended Route", `
      <h3>${esc(recommendedRoute.name)} ${scoreBar(recommendedRoute.score)}</h3>
      <p>
        <span class="role-badge role-${esc(recommendedRoute.strategicRole)}">${esc(recommendedRoute.strategicRole)}</span>
        ${recommendedRoute.rankingLabel ? `<span class="ranking-label">${esc(recommendedRoute.rankingLabel)}</span>` : ""}
      </p>
      <p class="killer-line">&ldquo;${esc(recommendedRoute.killerLine)}&rdquo;</p>
      ${kv("Enemy", recommendedRoute.enemy)}
      ${recommendedRoute.keyStrengths.length > 0 ? subsection("Strengths", ul(recommendedRoute.keyStrengths)) : ""}
      ${recommendedRoute.keyRisks.length > 0 ? subsection("Risks", ul(recommendedRoute.keyRisks)) : ""}
      ${kv("Why this route wins", report.whyRecommendedWins)}
      ${report.whereRunnerUpIsStronger ? kv("Where runner-up is stronger", report.whereRunnerUpIsStronger) : ""}
      ${kv("Biggest tradeoff", report.biggestTradeoff)}
    `));
  }

  // Selected Route — prominent callout
  if (report.selectedRouteId) {
    const selectedRoute = report.routes.find((r) => r.id === report.selectedRouteId);
    if (selectedRoute) {
      const isSameAsRecommended = report.selectedRouteId === report.recommendedRouteId;
      parts.push(section("Selected Route", `
        <div class="selected-callout">
          <p class="selected-label">Human selection</p>
          <h3 style="margin:0 0 4px;">${esc(selectedRoute.name)} ${scoreBar(selectedRoute.score)}</h3>
          <p style="margin:0 0 8px;">
            <span class="role-badge role-${esc(selectedRoute.strategicRole)}">${esc(selectedRoute.strategicRole)}</span>
            ${isSameAsRecommended ? `<span class="ranking-label">same as recommended</span>` : ""}
          </p>
          <p class="killer-line">&ldquo;${esc(selectedRoute.killerLine)}&rdquo;</p>
          ${kv("Enemy", selectedRoute.enemy)}
        </div>
      `));
    }
  }

  // Route Comparison with risk taxonomy
  const routeComparison = report.routes.map((route) => {
    const taxonomy = report.riskTaxonomy.find((t) => t.routeId === route.id);
    const riskBadge = taxonomy
      ? `<span style="font-size:0.75rem;font-weight:600;padding:2px 6px;border-radius:3px;background:#f5f5f5;color:#444;">${esc(taxonomy.severity)} · ${esc(taxonomy.primaryRiskType)}</span>`
      : "";
    return `
    <div style="border:1px solid #e5e5e5;border-radius:6px;padding:14px;margin-bottom:10px;">
      <h3 style="margin:0 0 4px;">${esc(route.name)} ${scoreBar(route.score)}</h3>
      <p style="margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        <span class="role-badge role-${esc(route.strategicRole)}">${esc(route.strategicRole)}</span>
        ${route.rankingLabel ? `<span class="ranking-label">${esc(route.rankingLabel)}</span>` : ""}
        ${riskBadge}
      </p>
      <p class="killer-line" style="font-size:0.9rem;">&ldquo;${esc(route.killerLine)}&rdquo;</p>
      ${kv("Enemy", route.enemy)}
      ${route.keyStrengths.length > 0 ? `<p><span class="label">Strengths</span>${esc(route.keyStrengths.join("; "))}</p>` : ""}
      ${route.keyRisks.length > 0 ? `<p><span class="label">Key risks</span>${esc(route.keyRisks.join("; "))}</p>` : ""}
      ${taxonomy ? `<p><span class="label">Risk note</span><em>${esc(taxonomy.explanation)}</em></p>` : ""}
    </div>
  `;
  }).join("");

  parts.push(section("Route Comparison", `
    ${routeComparison}
    ${subsection("Comparison notes", ul(report.comparisonDecisionNotes))}
  `));

  // Synthetic Audience Signals — route summaries first
  const routeSimCards = report.routeSimulationSummaries.map((rs) => `
    <div style="border:1px solid #e5e5e5;border-radius:6px;padding:12px;margin-bottom:8px;">
      <p style="margin:0 0 6px;font-weight:600;font-size:0.9rem;">${esc(rs.routeName)}</p>
      <div class="sim-scores" style="margin-bottom:8px;">
        <span>Resonance: ${rs.averageResonance.toFixed(1)}</span>
        <span>Conversion: ${rs.averageConversion.toFixed(1)}</span>
        <span>Email: ${rs.averageEmailCapture.toFixed(1)}</span>
      </div>
      <p><span class="label">Strongest persona</span>${esc(rs.strongestPersona)}</p>
      <p><span class="label">Main objection</span>${esc(rs.mainObjection)}</p>
      <p><span class="label">Best CTA</span>${esc(rs.bestCTA)}</p>
      <p style="margin-top:8px;font-size:0.85rem;color:#555;font-style:italic;">${esc(rs.decisionTakeaway)}</p>
    </div>
  `).join("");

  const simCards = report.simulations.map((sim) => `
    <div class="sim-card">
      <p><strong>${esc(sim.personaName)}</strong> on <strong>${esc(sim.routeName)}</strong></p>
      <div class="sim-scores">
        <span>Resonance: ${sim.resonanceScore.toFixed(1)}</span>
        <span>Conversion: ${sim.conversionIntent.toFixed(1)}</span>
      </div>
      <p class="quoted">&ldquo;${esc(sim.quotedReaction)}&rdquo;</p>
      <p><span class="label">Understood message</span>${esc(sim.understoodMessage)}</p>
      <p><span class="label">Main objection</span>${esc(sim.mainObjection)}</p>
      <p><span class="label">Best CTA</span>${esc(sim.bestCTA)}</p>
    </div>
  `).join("");

  parts.push(section("Synthetic Audience Signals", `
    <div class="caveat-box">${esc(report.syntheticCaveat)}</div>
    ${routeSimCards.length > 0 ? subsection("Route-level synthesis", routeSimCards) : ""}
    ${subsection("Persona reactions", simCards)}
  `));

  // Pre-mortem Risks
  const riskCards = report.topFailureRisks.map((risk) => `
    <div class="risk-card">
      <p class="risk-headline">${esc(risk.risk)}</p>
      <p><span class="label">Why it happens</span>${esc(risk.whyItHappens)}</p>
      <p><span class="label">Early warning sign</span>${esc(risk.earlyWarningSign)}</p>
      <p><span class="label">Mitigation</span>${esc(risk.mitigation)}</p>
      <p><span class="label">Affected team</span>${esc(risk.affectedTeam)}</p>
    </div>
  `).join("");

  parts.push(section("Pre-mortem Risks", `
    <p>${esc(report.premortemSummary)}</p>
    ${subsection("Top failure risks", riskCards)}
    ${report.overallRisks.length > 0 ? subsection("Overall risks", ul(report.overallRisks)) : ""}
  `));

  // Execution Plan
  if (report.executionPlan) {
    const plan = report.executionPlan;

    const phaseHtml = plan.launchPhases.map((phase) => `
      <div style="border:1px solid #e5e5e5;border-radius:6px;padding:14px;margin-bottom:10px;">
        <p><strong>${esc(phase.phase)}</strong> <span style="font-size:0.8rem;color:#888;">${esc(phase.timing)}</span></p>
        <p style="color:#666;font-style:italic;">${esc(phase.objective)}</p>
        <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-top:8px;">
          <div><p class="label" style="display:block;">Key actions</p>${ul(phase.keyActions)}</div>
          <div><p class="label" style="display:block;">Deliverables</p>${ul(phase.deliverables)}</div>
        </div>
      </div>
    `).join("");

    const channelHtml = plan.channelPlan.map((ch) => `
      <div style="border:1px solid #e5e5e5;border-radius:6px;padding:14px;margin-bottom:10px;">
        <p><strong>${esc(ch.channel)}</strong> — ${esc(ch.role)}</p>
        ${ul(ch.recommendedAssets)}
        ${ch.notes ? `<p style="font-style:italic;font-size:0.85rem;color:#888;">${esc(ch.notes)}</p>` : ""}
      </div>
    `).join("");

    const landingHtml = plan.landingPageBlocks.map((block) => `
      <div class="landing-block">
        <span class="block-name">${esc(block.block)}</span>
        <span class="block-purpose"> — ${esc(block.purpose)}</span>
        <p>${esc(block.content)}</p>
      </div>
    `).join("");

    const oohHtml = plan.oohHeadlines.map((h) => `<span class="ooh-line">${esc(h)}</span>`).join("");
    const hookHtml = plan.paidSocialHooks.map((h) => `<span class="social-hook">&ldquo;${esc(h)}&rdquo;</span>`).join("");

    parts.push(section("Execution Plan", `
      <h2>${esc(plan.planTitle)}</h2>
      <p>${esc(plan.strategicSummary)}</p>
      ${subsection("Assumptions", ul(plan.assumptions))}
      ${subsection("Hero Visual System", `<p>${esc(plan.heroVisualSystem)}</p>`)}
      ${subsection("Shoot List", ol(plan.shootList))}
      ${subsection("OOH Headlines", oohHtml)}
      ${subsection("Paid Social Hooks", hookHtml)}
      ${subsection("Landing Page Structure", landingHtml)}
      ${subsection("Launch Phases", phaseHtml)}
      ${subsection("Channel Plan", channelHtml)}
      ${subsection("Measurement Plan", ul(plan.measurementPlan.map((m) => `${m.metric}: ${m.purpose}`)))}
      ${subsection("Next Actions", ol(plan.nextActions))}
    `));
  }

  // Legal / Substantiation Notes
  if (report.executionPlan?.legalSubstantiationChecklist) {
    parts.push(section("Legal / Substantiation Notes", `
      <div class="legal-note">${esc(report.legalCaveat)}</div>
      ${ul(report.executionPlan.legalSubstantiationChecklist)}
    `));
  }

  // Trace Summary
  if (report.traceSummary && report.traceSummary.length > 0) {
    const traceItems = report.traceSummary.map(
      (t) => `${t.stageId} — ${t.status}${t.durationMs != null ? ` (${t.durationMs}ms)` : ""}`,
    );
    parts.push(section("Trace Summary", ul(traceItems)));
  }

  // Footer caveat
  parts.push(`<footer class="footer-caveat">
  <p>${esc(report.caveat)}</p>
  <p>${esc(report.syntheticCaveat)}</p>
  <p>${esc(report.legalCaveat)}</p>
  <p><em>This report was generated deterministically from structured workflow output. No LLM was used in report generation.</em></p>
</footer>`);

  parts.push("</body>\n</html>");

  return parts.join("\n");
}
