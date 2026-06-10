// Tests for POST /api/campaign/export route handler.
// Imports the handler directly — no HTTP server needed.
// No real OpenAI calls. No env vars required.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/export/route";
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

const MOCK_SCORES = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
const MOCK_COMPARISON = compareRoutes({
  routes: MOCK_ROUTES,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
});

const COMPLETED_RUN = buildMockCompletedCampaignRun("route-quiet-itinerary");

const VALID_BODY = {
  runId: "test-export-run",
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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/export — validation", () => {
  it("returns 400 for non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBeTruthy();
  });

  it("returns 422 for an empty body", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(422);
    const data = await response.json() as { error: string };
    expect(data.error).toBeTruthy();
  });

  it("returns 422 with useful field issues", async () => {
    const response = await POST(makeRequest({ routes: [] }));
    expect(response.status).toBe(422);
    const data = await response.json() as { issues: Array<{ path: string; message: string }> };
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.issues.length).toBeGreaterThan(0);
  });

  it("does not expose stack traces in error responses", async () => {
    const response = await POST(makeRequest({}));
    const text = await response.text();
    expect(text).not.toContain("at Object.");
    expect(text).not.toContain("at async");
  });
});

// ---------------------------------------------------------------------------
// Proof integrity guardrail — final boundary check before producing an artifact
// ---------------------------------------------------------------------------

function briefWithoutProofSignals() {
  return {
    ...MOCK_BRIEF,
    brandDescription: "Independent fashion brand with premium basics.",
    constraints: ["No fake airport shoot"],
    objectives: MOCK_BRIEF.objectives ?? [],
    openQuestions: [],
  };
}

describe("POST /api/campaign/export — proof integrity guardrail", () => {
  it("returns 422 and blocks export when a route claims unsupported customer proof", async () => {
    const taintedRoutes = MOCK_ROUTES.map((route, i) =>
      i === 0
        ? { ...route, proofMechanism: "Feature real customer testimonials and verified customer reviews." }
        : route,
    );
    const response = await POST(
      makeRequest({ ...VALID_BODY, normalizedBrief: briefWithoutProofSignals(), routes: taintedRoutes }),
    );

    expect(response.status).toBe(422);
    const data = (await response.json()) as { error: string; issues: Array<{ path: string; message: string }> };
    expect(data.error.toLowerCase()).toContain("export blocked");
    expect(data.issues.some((i) => i.path.includes("proofMechanism"))).toBe(true);
  });

  it("returns 422 when the pre-mortem review claims unsupported customer proof", async () => {
    const taintedPremortem = {
      ...MOCK_PREMORTEM,
      summary: "Mitigate weak resonance early by sourcing real customer testimonials before launch.",
    };
    const response = await POST(
      makeRequest({ ...VALID_BODY, normalizedBrief: briefWithoutProofSignals(), premortemReview: taintedPremortem }),
    );

    expect(response.status).toBe(422);
    const data = (await response.json()) as { issues: Array<{ path: string; message: string }> };
    expect(data.issues.some((i) => i.path === "premortemReview.summary")).toBe(true);
  });

  it("returns 422 when the execution plan claims unsupported customer proof", async () => {
    const taintedPlan = {
      ...COMPLETED_RUN.executionPlan!,
      strategicSummary: "A plan anchored in real customer testimonials and user-generated content.",
    };
    const response = await POST(
      makeRequest({ ...VALID_BODY, normalizedBrief: briefWithoutProofSignals(), executionPlan: taintedPlan }),
    );

    expect(response.status).toBe(422);
    const data = (await response.json()) as { issues: Array<{ path: string; message: string }> };
    expect(data.issues.some((i) => i.path === "executionPlan.strategicSummary")).toBe(true);
  });

  it("does not block export when the brief itself substantiates customer proof", async () => {
    const briefWithProof = {
      ...MOCK_BRIEF,
      brandDescription: "Independent fashion brand with existing customer testimonials and case studies.",
    };
    const taintedRoutes = MOCK_ROUTES.map((route, i) =>
      i === 0 ? { ...route, proofMechanism: "Feature real customer testimonials from the brand's case studies." } : route,
    );
    const response = await POST(makeRequest({ ...VALID_BODY, normalizedBrief: briefWithProof, routes: taintedRoutes }));

    expect(response.status).toBe(200);
  });

  it("allows the unmodified mock run through, which uses no unsupported proof language", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, normalizedBrief: briefWithoutProofSignals() }));
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PPTX route deck export
// ---------------------------------------------------------------------------

describe("POST /api/campaign/export — pptx", () => {
  it("returns 200 for a valid pptx export", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "pptx" }));
    expect(response.status).toBe(200);
  });

  it("returns correct Content-Type for pptx", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "pptx" }));
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  });

  it("returns correct Content-Disposition for pptx", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "pptx" }));
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("campaign-route-deck.pptx");
  });

  it("returns a non-empty binary ZIP-based payload", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "pptx" }));
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes.length).toBeGreaterThan(0);
    // ZIP local file header signature: "PK\x03\x04"
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("still applies the proof integrity guardrail to pptx export", async () => {
    const taintedRoutes = MOCK_ROUTES.map((route, i) =>
      i === 0
        ? { ...route, proofMechanism: "Feature real customer testimonials and verified customer reviews." }
        : route,
    );
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        normalizedBrief: briefWithoutProofSignals(),
        routes: taintedRoutes,
        format: "pptx",
      }),
    );
    expect(response.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

describe("POST /api/campaign/export — markdown", () => {
  it("returns 200 for a valid markdown export", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("returns correct Content-Type for markdown", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
  });

  it("returns correct Content-Disposition for markdown", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("campaign-strategy-report.md");
  });

  it("markdown body contains key sections", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const text = await response.text();
    expect(text).toContain("# Campaign Strategy Report");
    expect(text).toContain("## Executive Summary");
    expect(text).toContain("## Strategic Tension");
    expect(text).toContain("## Recommended Route");
    expect(text).toContain("## Pre-mortem Risks");
    expect(text).toContain("## Caveat");
  });

  it("markdown contains synthetic caveat", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const text = await response.text();
    expect(text.toLowerCase()).toContain("synthetic");
    expect(text.toLowerCase()).toContain("not real audience research");
  });

  it("markdown contains legal/substantiation caveat", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const text = await response.text();
    expect(text.toLowerCase()).toContain("substantiation");
  });

  it("markdown does not contain raw provider output", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const text = await response.text();
    expect(text).not.toContain('"routeId":');
    expect(text).not.toContain('"personaId":');
  });

  it("markdown contains execution plan sections", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const text = await response.text();
    expect(text).toContain("Execution Plan");
    expect(text).toContain("Hero Visual System");
    expect(text).toContain("Shoot List");
  });

  it("markdown works without executionPlan", async () => {
    const bodyNoplan = { ...VALID_BODY, executionPlan: undefined };
    const response = await POST(makeRequest(bodyNoplan));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("# Campaign Strategy Report");
  });
});

// ---------------------------------------------------------------------------
// HTML export
// ---------------------------------------------------------------------------

describe("POST /api/campaign/export — html", () => {
  it("returns 200 for a valid html export", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    expect(response.status).toBe(200);
  });

  it("returns correct Content-Type for html", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });

  it("returns correct Content-Disposition for html", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("campaign-strategy-report.html");
  });

  it("html body is a valid HTML document", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    const text = await response.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("</html>");
  });

  it("html escapes unsafe input", async () => {
    const xssBody = {
      ...VALID_BODY,
      format: "html",
      normalizedBrief: { ...MOCK_BRIEF, brandName: '<script>alert("xss")</script>' },
    };
    const response = await POST(makeRequest(xssBody));
    const text = await response.text();
    expect(text).not.toContain('<script>alert("xss")</script>');
    expect(text).toContain("&lt;script&gt;");
  });

  it("html contains synthetic caveat", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    const text = await response.text();
    expect(text.toLowerCase()).toContain("synthetic");
  });

  it("html contains no external script tags", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    const text = await response.text();
    expect(text).not.toMatch(/<script\s+src=/i);
  });

  it("html does not expose API keys or env values", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, format: "html" }));
    const text = await response.text();
    // sk-proj- and sk-test- are OpenAI API key prefixes; "sk-" alone may appear in legitimate content
    expect(text).not.toMatch(/sk-[a-zA-Z0-9_-]{20,}/);
    expect(text).not.toContain("OPENAI_API_KEY");
    expect(text).not.toContain("process.env");
  });
});
