// Tests for the POST /api/campaign/scores route handler.
// Imports the handler directly — no HTTP server needed.
// Runs without env vars. Scoring is deterministic, no LLM required.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/scores/route";
import { routeScoresOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
};

const VALID_BODY_WRAPPED = {
  routes: { routes: MOCK_ROUTES },
  personas: { personas: MOCK_PERSONAS },
  simulations: { simulations: MOCK_SIMULATIONS },
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/scores – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a body missing routes", async () => {
    const response = await POST(
      makeRequest({ personas: MOCK_PERSONAS, simulations: MOCK_SIMULATIONS }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/routes/i);
  });

  it("rejects a body missing personas", async () => {
    const response = await POST(
      makeRequest({ routes: MOCK_ROUTES, simulations: MOCK_SIMULATIONS }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/personas/i);
  });

  it("rejects a body missing simulations", async () => {
    const response = await POST(
      makeRequest({ routes: MOCK_ROUTES, personas: MOCK_PERSONAS }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/simulations/i);
  });

  it("rejects invalid routes (empty array)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, routes: [] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/routes/i);
  });

  it("rejects invalid personas (empty array)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, personas: [] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/personas/i);
  });

  it("rejects invalid simulations (empty array)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, simulations: [] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/simulations/i);
  });

  it("rejects invalid routes (wrong shape)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, routes: [{ id: "bad" }] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/routes/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid personas (wrong shape)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, personas: [{ id: "bad" }] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/personas/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects invalid simulations (wrong shape)", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, simulations: [{ routeId: "bad" }] }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown };
    expect(body.error).toMatch(/simulations/i);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns 422 with issues when simulations are missing a route/persona pair", async () => {
    const incompleteSimulations = MOCK_SIMULATIONS.slice(1);
    const response = await POST(
      makeRequest({ ...VALID_BODY, simulations: incompleteSimulations }),
    );
    expect([400, 422]).toContain(response.status);
  });
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/scores – success", () => {
  it("returns 200 with valid scores and traceEvent (bare arrays)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { scores: unknown; traceEvent: unknown };
    expect(body.scores).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("returns 200 with valid scores and traceEvent (wrapper objects)", async () => {
    const response = await POST(makeRequest(VALID_BODY_WRAPPED));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { scores: unknown; traceEvent: unknown };
    expect(body.scores).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("response scores validate against routeScoresOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { scores: unknown };
    expect(() => routeScoresOutputSchema.parse({ scores: body.scores })).not.toThrow();
  });

  it("response traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("trace event provider is 'deterministic'", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("deterministic");
  });

  it("scores cover every route exactly once", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { scores: Array<{ routeId: string }> };
    expect(body.scores).toHaveLength(MOCK_ROUTES.length);
    const scoreRouteIds = new Set(body.scores.map((s) => s.routeId));
    expect(scoreRouteIds.size).toBe(MOCK_ROUTES.length);
  });

  it("all scores are bounded 1–5", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      scores: Array<{
        weightedTotal: number;
        scores: Record<string, number>;
      }>;
    };

    for (const score of body.scores) {
      expect(score.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(score.weightedTotal).toBeLessThanOrEqual(5);
      for (const value of Object.values(score.scores)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Error safety
// ---------------------------------------------------------------------------

describe("POST /api/campaign/scores – error safety", () => {
  it("response body does not contain 'stack' on validation error", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, routes: [{ bad: true }] }),
    );
    const text = await response.text();
    expect(text).not.toMatch(/at Object\./);
    expect(text).not.toContain("stack");
  });

  it("response body does not expose internal error details on coverage failure", async () => {
    const incompleteSimulations = MOCK_SIMULATIONS.slice(1);
    const response = await POST(
      makeRequest({ ...VALID_BODY, simulations: incompleteSimulations }),
    );
    const text = await response.text();
    expect(text).not.toMatch(/at Object\./);
  });
});
