// Tests for the POST /api/campaign/premortem route handler.
// Imports the handler directly — no HTTP server needed.
// Runs without env vars. Mock mode requires no OPENAI_API_KEY.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/premortem/route";
import { premortemReviewOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";

const MOCK_SCORES = scoreRoutes(MOCK_CAMPAIGN_ROUTES, MOCK_SIMULATIONS);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/premortem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
};

const VALID_BODY_WRAPPED = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: { routes: MOCK_CAMPAIGN_ROUTES },
  personas: { personas: MOCK_PERSONAS },
  simulations: { simulations: MOCK_SIMULATIONS },
  scores: { scores: MOCK_SCORES },
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/premortem – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/premortem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a body missing normalizedBrief", async () => {
    const { normalizedBrief: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/normalizedBrief/i);
  });

  it("rejects a body missing strategicTension", async () => {
    const { strategicTension: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/strategicTension/i);
  });

  it("rejects a body missing routes", async () => {
    const { routes: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/routes/i);
  });

  it("rejects a body missing personas", async () => {
    const { personas: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/personas/i);
  });

  it("rejects a body missing simulations", async () => {
    const { simulations: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/simulations/i);
  });

  it("rejects a body missing scores", async () => {
    const { scores: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/scores/i);
  });

  it("rejects an invalid normalizedBrief (missing brandName)", async () => {
    const { brandName: _, ...badBrief } = MOCK_NORMALIZED_BRIEF;
    const response = await POST(makeRequest({ ...VALID_BODY, normalizedBrief: badBrief }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/normalizedBrief/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects an invalid strategicTension (missing coreTension)", async () => {
    const { coreTension: _, ...badTension } = MOCK_STRATEGIC_TENSION;
    const response = await POST(makeRequest({ ...VALID_BODY, strategicTension: badTension }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/strategicTension/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid routes (empty array)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, routes: [] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/routes/i);
  });

  it("rejects invalid routes (wrong shape)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, routes: [{ id: "bad" }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/routes/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid personas (empty array)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, personas: [] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/personas/i);
  });

  it("rejects invalid personas (wrong shape)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, personas: [{ id: "bad" }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/personas/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid simulations (empty array)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, simulations: [] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/simulations/i);
  });

  it("rejects invalid simulations (wrong shape)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, simulations: [{ routeId: "bad" }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/simulations/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid scores (empty array)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, scores: [] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/scores/i);
  });

  it("rejects invalid scores (wrong shape)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, scores: [{ routeId: "bad" }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/scores/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/premortem – success", () => {
  it("returns 200 with valid review and traceEvent (bare arrays)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { review: unknown; traceEvent: unknown };
    expect(body.review).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("returns 200 with valid review and traceEvent (wrapper objects)", async () => {
    const response = await POST(makeRequest(VALID_BODY_WRAPPED));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { review: unknown; traceEvent: unknown };
    expect(body.review).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("response review validates against premortemReviewOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { review: unknown };
    expect(() => premortemReviewOutputSchema.parse({ review: body.review })).not.toThrow();
  });

  it("response traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("review covers every route exactly once", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      review: { routeRisks: Array<{ routeId: string }> };
    };
    expect(body.review.routeRisks).toHaveLength(MOCK_CAMPAIGN_ROUTES.length);
    const ids = new Set(body.review.routeRisks.map((rr) => rr.routeId));
    expect(ids.size).toBe(MOCK_CAMPAIGN_ROUTES.length);
  });

  it("trace event provider is 'mock' in mock mode", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("mock");
  });

  it("trace event stageId is 'premortem_review'", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: { stageId: string } };
    expect(body.traceEvent.stageId).toBe("premortem_review");
  });

  it("route works without env vars (mock mode)", async () => {
    // No CAMPAIGN_SANDBOX_LLM_PROVIDER or OPENAI_API_KEY set.
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Error safety
// ---------------------------------------------------------------------------

describe("POST /api/campaign/premortem – error safety", () => {
  it("response body does not contain stack traces on validation error", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, routes: [{ bad: true }] }));
    const text = await response.text();
    expect(text).not.toMatch(/at Object\./);
    expect(text).not.toContain("stack");
  });

  it("response body does not expose raw provider output on validation error", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, normalizedBrief: { bad: true } }));
    const text = await response.text();
    expect(text).not.toMatch(/ZodError/);
    expect(text).not.toMatch(/at Object\./);
  });

  it("response body does not expose ZodError internals on invalid input", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, personas: [{ not_a_persona: true }] }),
    );
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain("ZodError");
    expect(text).not.toMatch(/at Object\./);
  });
});
