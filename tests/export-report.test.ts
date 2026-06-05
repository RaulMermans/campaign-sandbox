// Tests for the deterministic export report pipeline.
// No LLM calls. No real API calls. No env vars required.
// Tests: report model building, markdown rendering, HTML rendering, escaping, caveats.

import { describe, expect, it } from "vitest";
import { buildCampaignReport } from "@/lib/export/build-campaign-report";
import { renderMarkdownReport } from "@/lib/export/render-markdown-report";
import { renderHtmlReport } from "@/lib/export/render-html-report";
import {
  normalizedBrief as MOCK_BRIEF,
  strategicTension as MOCK_TENSION,
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
  buildMockCompletedCampaignRun,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { compareRoutes } from "@/lib/scoring/compare-routes";
import type { CampaignExportInput } from "@/lib/schemas/campaign";

const MOCK_SCORES = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
const MOCK_COMPARISON = compareRoutes({
  routes: MOCK_ROUTES,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
});

const COMPLETED_RUN = buildMockCompletedCampaignRun("route-quiet-itinerary");

const BASE_INPUT: CampaignExportInput = {
  runId: "test-run-001",
  normalizedBrief: MOCK_BRIEF,
  strategicTension: MOCK_TENSION,
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
  comparison: MOCK_COMPARISON,
  selectedRouteId: "route-quiet-itinerary",
  executionPlan: COMPLETED_RUN.executionPlan,
  format: "markdown",
};

// ---------------------------------------------------------------------------
// buildCampaignReport
// ---------------------------------------------------------------------------

describe("buildCampaignReport", () => {
  it("builds a report from a valid completed run", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report).toBeDefined();
    expect(report.title).toContain(MOCK_BRIEF.brandName);
  });

  it("includes synthetic caveat", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.syntheticCaveat.toLowerCase()).toContain("synthetic");
    expect(report.syntheticCaveat.toLowerCase()).toContain("not real audience research");
  });

  it("includes legal caveat", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.legalCaveat.toLowerCase()).toContain("substantiation");
  });

  it("includes planning document caveat", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.caveat.toLowerCase()).toContain("planning document");
  });

  it("includes recommended route ID", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.recommendedRouteId).toBeDefined();
    const routeIds = MOCK_ROUTES.map((r) => r.id);
    expect(routeIds).toContain(report.recommendedRouteId);
  });

  it("includes selected route when provided", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.selectedRouteId).toBe("route-quiet-itinerary");
    expect(report.selectedRouteName).toBeDefined();
  });

  it("includes execution plan when provided", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.executionPlan).toBeDefined();
    expect(report.executionPlan?.heroVisualSystem).toBeDefined();
    expect(report.executionPlan?.shootList.length).toBeGreaterThanOrEqual(1);
    expect(report.executionPlan?.oohHeadlines.length).toBeGreaterThanOrEqual(1);
    expect(report.executionPlan?.paidSocialHooks.length).toBeGreaterThanOrEqual(1);
    expect(report.executionPlan?.landingPageBlocks.length).toBeGreaterThanOrEqual(1);
    expect(report.executionPlan?.legalSubstantiationChecklist.length).toBeGreaterThanOrEqual(1);
  });

  it("omits execution plan when not provided", () => {
    const report = buildCampaignReport({ ...BASE_INPUT, executionPlan: undefined });
    expect(report.executionPlan).toBeUndefined();
  });

  it("includes top failure risks", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.topFailureRisks.length).toBeGreaterThanOrEqual(1);
    for (const risk of report.topFailureRisks) {
      expect(risk.risk).toBeTruthy();
      expect(risk.whyItHappens).toBeTruthy();
      expect(risk.earlyWarningSign).toBeTruthy();
      expect(risk.mitigation).toBeTruthy();
      expect(risk.affectedTeam).toBeTruthy();
    }
  });

  it("includes route summaries with killerLine and enemy", () => {
    const report = buildCampaignReport(BASE_INPUT);
    for (const route of report.routes) {
      expect(route.killerLine).toBeTruthy();
      expect(route.enemy).toBeTruthy();
    }
  });

  it("includes simulation summaries with decision fields", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.simulations.length).toBeGreaterThanOrEqual(1);
    for (const sim of report.simulations) {
      expect(sim.understoodMessage).toBeTruthy();
      expect(sim.mainObjection).toBeTruthy();
      expect(sim.bestCTA).toBeTruthy();
      expect(sim.caveat.toLowerCase()).toContain("synthetic");
    }
  });

  it("does not include raw provider output or API keys", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const reportStr = JSON.stringify(report);
    // sk-proj- and sk-test- are OpenAI API key prefixes; "sk-" alone may appear in legitimate content
    expect(reportStr).not.toMatch(/sk-[a-zA-Z0-9_-]{20,}/);
    expect(reportStr).not.toContain("OPENAI_API_KEY");
    expect(reportStr).not.toContain("process.env");
  });

  it("includes tension statement fields", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.tensionStatement).toBeTruthy();
    expect(report.audienceDesire).toBeTruthy();
    expect(report.audienceResistance).toBeTruthy();
    expect(report.brandProofChallenge).toBeTruthy();
    expect(report.creativeTrap).toBeTruthy();
  });

  it("includes comparison win explanation", () => {
    const report = buildCampaignReport(BASE_INPUT);
    expect(report.whyRecommendedWins).toBeTruthy();
    expect(report.biggestTradeoff).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// renderMarkdownReport
// ---------------------------------------------------------------------------

describe("renderMarkdownReport", () => {
  it("renders a non-empty string", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(100);
  });

  it("contains key section headings", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(md).toContain("# Campaign Strategy Report");
    expect(md).toContain("## Executive Summary");
    expect(md).toContain("## Strategic Tension");
    expect(md).toContain("## Recommended Route");
    expect(md).toContain("## Route Comparison");
    expect(md).toContain("## Synthetic Audience Signals");
    expect(md).toContain("## Pre-mortem Risks");
    expect(md).toContain("## Caveat");
  });

  it("contains execution plan sections when plan is present", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(md).toContain("## Execution Plan");
    expect(md).toContain("Hero Visual System");
    expect(md).toContain("Shoot List");
    expect(md).toContain("OOH Headlines");
    expect(md).toContain("Paid Social Hooks");
    expect(md).toContain("Landing Page Structure");
  });

  it("contains synthetic caveat text", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(md.toLowerCase()).toContain("synthetic");
    expect(md.toLowerCase()).toContain("not real audience research");
  });

  it("contains legal/substantiation caveat", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(md.toLowerCase()).toContain("substantiation");
  });

  it("contains selected route when provided", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    expect(md).toContain("## Selected Route");
  });

  it("does not contain raw JSON dumps", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const md = renderMarkdownReport(report);
    // Should not contain multi-line JSON objects
    expect(md).not.toMatch(/^\s*"routeId":/m);
    expect(md).not.toMatch(/^\s*"personaId":/m);
  });

  it("deterministic: same input produces same output", () => {
    const report1 = buildCampaignReport(BASE_INPUT);
    const report2 = buildCampaignReport(BASE_INPUT);
    expect(renderMarkdownReport(report1)).toBe(renderMarkdownReport(report2));
  });
});

// ---------------------------------------------------------------------------
// renderHtmlReport
// ---------------------------------------------------------------------------

describe("renderHtmlReport", () => {
  it("renders a non-empty HTML string", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(typeof html).toBe("string");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("contains key section headings", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Strategic Tension");
    expect(html).toContain("Recommended Route");
    expect(html).toContain("Route Comparison");
    expect(html).toContain("Synthetic Audience Signals");
    expect(html).toContain("Pre-mortem Risks");
  });

  it("escapes unsafe text to prevent XSS", () => {
    const maliciousInput: CampaignExportInput = {
      ...BASE_INPUT,
      normalizedBrief: {
        ...MOCK_BRIEF,
        brandName: '<script>alert("xss")</script>',
      },
    };
    const report = buildCampaignReport(maliciousInput);
    const html = renderHtmlReport(report);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML entities in route names", () => {
    const dangerousInput: CampaignExportInput = {
      ...BASE_INPUT,
      routes: MOCK_ROUTES.map((r, i) =>
        i === 0 ? { ...r, name: 'Route <b>name</b> & "quotes"' } : r,
      ),
    };
    const report = buildCampaignReport(dangerousInput);
    const html = renderHtmlReport(report);
    expect(html).not.toMatch(/<b>name<\/b>/);
    expect(html).toContain("&lt;b&gt;name&lt;/b&gt;");
  });

  it("contains synthetic caveat in HTML", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(html.toLowerCase()).toContain("synthetic");
  });

  it("contains no external scripts", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(html).not.toMatch(/<script\s+src=/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("contains execution plan sections when plan is provided", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(html).toContain("Execution Plan");
    expect(html).toContain("Hero Visual System");
    expect(html).toContain("Shoot List");
    expect(html).toContain("OOH Headlines");
  });

  it("contains legal caveat in footer", () => {
    const report = buildCampaignReport(BASE_INPUT);
    const html = renderHtmlReport(report);
    expect(html.toLowerCase()).toContain("substantiation");
    expect(html).toContain("footer");
  });
});
