// Tests for the POST /api/campaign/creative-review route handler.
// Imports the handler directly — no HTTP server needed.
// Runs without env vars. Mock mode requires no OPENAI_API_KEY.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/creative-review/route";
import { creativeDirectorReviewOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
} from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/creative-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
};

const VALID_BODY_WRAPPED = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: { routes: MOCK_CAMPAIGN_ROUTES },
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/creative-review – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/creative-review", {
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
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/creative-review – success", () => {
  it("returns 200 with valid review and traceEvent (bare array)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { review: unknown; traceEvent: unknown };
    expect(body.review).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("returns 200 with valid review and traceEvent (wrapper object)", async () => {
    const response = await POST(makeRequest(VALID_BODY_WRAPPED));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { review: unknown; traceEvent: unknown };
    expect(body.review).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("response review validates against creativeDirectorReviewOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { review: unknown };
    expect(() => creativeDirectorReviewOutputSchema.parse({ review: body.review })).not.toThrow();
  });

  it("response traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("review covers every route exactly once", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      review: { routeReviews: Array<{ routeId: string }> };
    };
    expect(body.review.routeReviews).toHaveLength(MOCK_CAMPAIGN_ROUTES.length);
    const ids = new Set(body.review.routeReviews.map((rr) => rr.routeId));
    expect(ids.size).toBe(MOCK_CAMPAIGN_ROUTES.length);
  });

  it("trace event provider is 'mock' in mock mode", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("mock");
  });

  it("trace event stageId is 'creative_director_review'", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: { stageId: string } };
    expect(body.traceEvent.stageId).toBe("creative_director_review");
  });

  it("route works without env vars (mock mode)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("does not expose stack traces or internal paths on error", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, routes: [{ id: "bad" }] }));
    const text = await response.text();
    expect(text).not.toMatch(/at \w+ \(/);
    expect(text).not.toMatch(/node_modules/);
  });
});
