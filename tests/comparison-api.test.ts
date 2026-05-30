// Tests for POST /api/campaign/comparison route handler.
// Imports the handler directly — no HTTP server needed.
// Runs without env vars. Mock mode requires no OPENAI_API_KEY.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/comparison/route";
import { routeComparisonMatrixSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";

const MOCK_SCORES = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/comparison", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
};

const VALID_BODY_WRAPPED = {
  routes: { routes: MOCK_ROUTES },
  personas: { personas: MOCK_PERSONAS },
  simulations: { simulations: MOCK_SIMULATIONS },
  scores: { scores: MOCK_SCORES },
  premortemReview: MOCK_PREMORTEM,
};

const VALID_BODY_REVIEW_KEY = {
  ...VALID_BODY,
  premortemReview: undefined,
  review: MOCK_PREMORTEM,
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/comparison – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects missing 'routes'", async () => {
    const { routes: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
  });

  it("rejects missing 'personas'", async () => {
    const { personas: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
  });

  it("rejects missing 'simulations'", async () => {
    const { simulations: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
  });

  it("rejects missing 'scores'", async () => {
    const { scores: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
  });

  it("rejects missing premortemReview and review", async () => {
    const { premortemReview: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
  });

  it("rejects invalid routes", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, routes: [{ bad: true }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("routes");
  });

  it("rejects invalid scores", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, scores: [{ bad: true }] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("scores");
  });

  it("rejects invalid premortemReview", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, premortemReview: { bad: true } }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("premortemReview");
  });
});

// ---------------------------------------------------------------------------
// Successful response
// ---------------------------------------------------------------------------

describe("POST /api/campaign/comparison – success", () => {
  it("returns 200 with valid comparison and traceEvent", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { comparison: unknown; traceEvent: unknown };
    expect(body.comparison).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("comparison validates against routeComparisonMatrixSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { comparison: unknown };
    expect(() => routeComparisonMatrixSchema.parse(body.comparison)).not.toThrow();
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("accepts bare arrays for routes, personas, simulations, scores", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("accepts wrapper objects for routes, personas, simulations, scores", async () => {
    const response = await POST(makeRequest(VALID_BODY_WRAPPED));
    expect(response.status).toBe(200);
  });

  it("accepts 'review' key instead of 'premortemReview'", async () => {
    const response = await POST(makeRequest(VALID_BODY_REVIEW_KEY));
    expect(response.status).toBe(200);
  });

  it("does not expose raw Error stack traces", async () => {
    const response = await POST(makeRequest({ routes: [{ bad: true }], personas: [], simulations: [], scores: [], premortemReview: {} }));
    const body = await response.text();
    // Stack traces contain indented "at " lines — check for that pattern.
    expect(body).not.toMatch(/\n\s{2,}at\s+\w/);
  });
});
