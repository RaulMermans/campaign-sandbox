// Tests for the deterministic PPTX route deck export.
// No LLM calls. No real API calls. No env vars required.
// Verifies the generated artifact is a valid OOXML ZIP with the expected
// slide count and that every slide carries the same caveat language shown
// in the markdown/HTML exports.

import { describe, expect, it, beforeAll } from "vitest";
import JSZip from "jszip";
import { buildCampaignReport } from "@/lib/export/build-campaign-report";
import { buildRouteDeckPptx } from "@/lib/export/build-route-deck-pptx";
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
  runId: "test-run-pptx",
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
  format: "pptx",
};

const REPORT = buildCampaignReport(BASE_INPUT);

let zip: JSZip;
let slideTexts: string[];

const A_T_REGEX = /<a:t[^>]*>([^<]*)<\/a:t>/g;

function extractSlideText(xml: string): string {
  const texts: string[] = [];
  let match;
  A_T_REGEX.lastIndex = 0;
  while ((match = A_T_REGEX.exec(xml)) !== null) {
    texts.push(match[1]);
  }
  return texts.join(" ");
}

beforeAll(async () => {
  const bytes = await buildRouteDeckPptx(REPORT);
  zip = await JSZip.loadAsync(bytes);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return numA - numB;
    });

  slideTexts = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("text");
    slideTexts.push(extractSlideText(xml));
  }
});

describe("buildRouteDeckPptx — package structure", () => {
  it("produces a valid ZIP archive with required OOXML parts", () => {
    expect(zip.files["[Content_Types].xml"]).toBeDefined();
    expect(zip.files["_rels/.rels"]).toBeDefined();
    expect(zip.files["docProps/core.xml"]).toBeDefined();
    expect(zip.files["docProps/app.xml"]).toBeDefined();
    expect(zip.files["ppt/presentation.xml"]).toBeDefined();
    expect(zip.files["ppt/_rels/presentation.xml.rels"]).toBeDefined();
    expect(zip.files["ppt/slideMasters/slideMaster1.xml"]).toBeDefined();
    expect(zip.files["ppt/slideLayouts/slideLayout1.xml"]).toBeDefined();
    expect(zip.files["ppt/theme/theme1.xml"]).toBeDefined();
  });

  it("declares a content type override for every slide", async () => {
    const contentTypes = await zip.files["[Content_Types].xml"].async("text");
    for (let i = 1; i <= slideTexts.length; i++) {
      expect(contentTypes).toContain(`/ppt/slides/slide${i}.xml`);
    }
  });

  it("references every slide from the presentation relationships", async () => {
    const rels = await zip.files["ppt/_rels/presentation.xml.rels"].async("text");
    for (let i = 1; i <= slideTexts.length; i++) {
      expect(rels).toContain(`slides/slide${i}.xml`);
    }
  });

  it("gives each slide a relationship to the slide layout", async () => {
    for (let i = 1; i <= slideTexts.length; i++) {
      const rels = await zip.files[`ppt/slides/_rels/slide${i}.xml.rels`].async("text");
      expect(rels).toContain("../slideLayouts/slideLayout1.xml");
    }
  });

  it("produces one slide per route plus title, decision, and caveat slides", () => {
    expect(slideTexts.length).toBe(REPORT.routes.length + 3);
  });
});

describe("buildRouteDeckPptx — slide content", () => {
  it("title slide names the brand and states the capsule description", () => {
    expect(slideTexts[0]).toContain(REPORT.brandName);
    expect(slideTexts[0]).toContain(REPORT.capsuleDescription);
  });

  it("title slide carries the report-level caveat", () => {
    expect(slideTexts[0]).toContain(REPORT.caveat);
  });

  it("decision slide names the recommended route and states the tradeoff", () => {
    expect(slideTexts[1]).toContain(REPORT.decisionSummary.recommendedRouteName);
    expect(slideTexts[1]).toContain(REPORT.decisionSummary.biggestTradeoff);
    expect(slideTexts[1]).toContain(REPORT.decisionSummary.riskType);
  });

  it("decision slide reiterates that human selection is required", () => {
    expect(slideTexts[1].toLowerCase()).toContain("human selection is required");
  });

  it("includes a slide per route naming the route and its killer line", () => {
    REPORT.routes.forEach((route, i) => {
      const slideText = slideTexts[2 + i];
      expect(slideText).toContain(route.name);
      expect(slideText).toContain(route.killerLine);
      expect(slideText).toContain(route.enemy);
    });
  });

  it("marks the recommended route on its slide", () => {
    const recommendedIndex = REPORT.routes.findIndex((r) => r.id === REPORT.recommendedRouteId);
    expect(slideTexts[2 + recommendedIndex]).toContain("Recommended route");
  });

  it("route slides state scores as strategic estimates, not predictions", () => {
    const scoredIndex = REPORT.routes.findIndex((r) => r.score != null);
    expect(scoredIndex).toBeGreaterThanOrEqual(0);
    expect(slideTexts[2 + scoredIndex].toLowerCase()).toContain("strategic estimate, not a prediction");
  });

  it("route slides surface the risk taxonomy classification", () => {
    REPORT.routes.forEach((route, i) => {
      const taxonomy = REPORT.riskTaxonomy.find((t) => t.routeId === route.id);
      if (!taxonomy) return;
      expect(slideTexts[2 + i]).toContain(taxonomy.primaryRiskType);
      expect(slideTexts[2 + i]).toContain(taxonomy.explanation);
    });
  });

  it("closing slide repeats the synthetic and legal caveats verbatim", () => {
    const closing = slideTexts[slideTexts.length - 1];
    expect(closing).toContain(REPORT.syntheticCaveat);
    expect(closing).toContain(REPORT.legalCaveat);
    expect(closing.toLowerCase()).toContain("human judgment");
  });
});

describe("buildRouteDeckPptx — safety framing", () => {
  it("never claims synthetic reactions are real research", () => {
    const fullText = slideTexts.join(" ").toLowerCase();
    expect(fullText).not.toContain("real audience research conducted");
    expect(fullText).toContain("synthetic");
  });

  it("frames every numeric route score as a strategic estimate", () => {
    const fullText = slideTexts.join(" ");
    const scoreLines = REPORT.routes.filter((r) => r.score != null);
    for (const route of scoreLines) {
      const slideText = slideTexts[2 + REPORT.routes.indexOf(route)];
      expect(slideText).toMatch(/strategic estimate, not a prediction/);
    }
    expect(fullText.toLowerCase()).toContain("not a prediction");
  });
});
