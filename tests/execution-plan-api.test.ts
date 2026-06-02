// Tests for the POST /api/campaign/execution-plan route handler.
// Imports the handler directly — no HTTP server needed.
// Runs without env vars. Mock mode requires no OPENAI_API_KEY.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/campaign/execution-plan/route";
import { campaignExecutionPlanOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  normalizedBrief as MOCK_BRIEF,
  strategicTension as MOCK_TENSION,
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
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

const SELECTED_ROUTE_ID = MOCK_ROUTES[0].id;

const VALID_BODY = {
  selectedRouteId: SELECTED_ROUTE_ID,
  normalizedBrief: MOCK_BRIEF,
  strategicTension: MOCK_TENSION,
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
  comparison: MOCK_COMPARISON,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/execution-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/execution-plan — input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/execution-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a body missing selectedRouteId", async () => {
    const { selectedRouteId: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/selectedRouteId/i);
  });

  it("rejects an empty selectedRouteId", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, selectedRouteId: "" }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/selectedRouteId/i);
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

  it("rejects a body missing premortemReview", async () => {
    const { premortemReview: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/premortemReview/i);
  });

  it("rejects a body missing comparison", async () => {
    const { comparison: _, ...rest } = VALID_BODY;
    const response = await POST(makeRequest(rest));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/comparison/i);
  });

  it("rejects an invalid selectedRouteId (not in routes) with 422", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, selectedRouteId: "route-does-not-exist" }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.code).toBe("INVALID_SELECTED_ROUTE");
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/execution-plan — happy path", () => {
  it("returns 200 in mock mode", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("response body validates against campaignExecutionPlanOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { executionPlan: unknown };
    expect(() =>
      campaignExecutionPlanOutputSchema.parse({ executionPlan: body.executionPlan }),
    ).not.toThrow();
  });

  it("response includes a valid traceEvent", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("selectedRouteId is preserved in execution plan", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { executionPlan: { selectedRouteId: string } };
    expect(body.executionPlan.selectedRouteId).toBe(SELECTED_ROUTE_ID);
  });

  it("accepts wrapped routes array", async () => {
    const wrapped = { ...VALID_BODY, routes: { routes: MOCK_ROUTES } };
    const response = await POST(makeRequest(wrapped));
    expect(response.status).toBe(200);
  });

  it("accepts wrapped personas array", async () => {
    const wrapped = { ...VALID_BODY, personas: { personas: MOCK_PERSONAS } };
    const response = await POST(makeRequest(wrapped));
    expect(response.status).toBe(200);
  });

  it("accepts wrapped simulations array", async () => {
    const wrapped = { ...VALID_BODY, simulations: { simulations: MOCK_SIMULATIONS } };
    const response = await POST(makeRequest(wrapped));
    expect(response.status).toBe(200);
  });

  it("accepts wrapped scores array", async () => {
    const wrapped = { ...VALID_BODY, scores: { scores: MOCK_SCORES } };
    const response = await POST(makeRequest(wrapped));
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Error sanitization
// ---------------------------------------------------------------------------

describe("POST /api/campaign/execution-plan — error sanitization", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-fake");
    vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
  });

  it("returns 502 and no stack trace on provider error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    } as unknown as Response);

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe("LLM_PROVIDER_ERROR");
    expect(body.stack).toBeUndefined();
  });

  it("returns 502 on JSON parse error without raw content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "this is not json {{{" } }],
      }),
    } as unknown as Response);

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");
    expect(JSON.stringify(body)).not.toMatch(/this is not json/);
  });
});
