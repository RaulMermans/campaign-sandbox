// Tests for POST /api/campaign/routes route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode by default (no OPENAI_API_KEY required).

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/campaign/routes/route";
import { campaignRouteSchema, campaignRoutesOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import { normalizedBrief, strategicTension } from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/routes – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a missing normalizedBrief field", async () => {
    const response = await POST(makeRequest({ strategicTension }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Missing required field: normalizedBrief.");
  });

  it("rejects a missing strategicTension field", async () => {
    const response = await POST(makeRequest({ normalizedBrief }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Missing required field: strategicTension.");
  });

  it("rejects an invalid normalizedBrief (empty object)", async () => {
    const response = await POST(makeRequest({ normalizedBrief: {}, strategicTension }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid normalizedBrief input.");
  });

  it("rejects an invalid strategicTension (empty object)", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension: {} }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid strategicTension input.");
  });

  it("rejects an invalid normalizedBrief (null)", async () => {
    const response = await POST(makeRequest({ normalizedBrief: null, strategicTension }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid strategicTension (null)", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension: null }));
    expect(response.status).toBe(400);
  });

  it("validation error includes issues array for normalizedBrief", async () => {
    const response = await POST(makeRequest({ normalizedBrief: { brandName: "" }, strategicTension }));
    const body = await response.json() as { error: string; issues?: unknown[] };
    expect(response.status).toBe(400);
    expect(body.issues).toBeDefined();
  });

  it("validation error includes issues array for strategicTension", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension: { coreTension: "" } }));
    const body = await response.json() as { error: string; issues?: unknown[] };
    expect(response.status).toBe(400);
    expect(body.issues).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/routes – mock provider mode", () => {
  it("returns 200 with routes and traceEvent in mock mode", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    expect(response.status).toBe(200);

    const body = await response.json() as { routes: unknown; traceEvent: unknown };
    expect(body.routes).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("routes array validates against campaignRoutesOutputSchema", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { routes: unknown };
    expect(() => campaignRoutesOutputSchema.parse({ routes: body.routes })).not.toThrow();
  });

  it("each route validates against campaignRouteSchema", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { routes: unknown[] };
    for (const route of body.routes) {
      expect(() => campaignRouteSchema.parse(route)).not.toThrow();
    }
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("mock");
  });

  it("routes array has between 3 and 5 items", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { routes: unknown[] };
    expect(body.routes.length).toBeGreaterThanOrEqual(3);
    expect(body.routes.length).toBeLessThanOrEqual(5);
  });

  it("routes include safest, boldest, and conversion strategicRoles", async () => {
    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    const body = await response.json() as { routes: Array<{ strategicRole: string }> };
    const roles = body.routes.map((r) => r.strategicRole);
    expect(roles).toContain("safest");
    expect(roles).toContain("boldest");
    expect(roles).toContain("conversion");
  });
});

// ---------------------------------------------------------------------------
// Error sanitization — raw provider output must not be exposed
// ---------------------------------------------------------------------------

describe("POST /api/campaign/routes – error sanitization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns LLM_PROVIDER_ERROR code without raw provider output when API key missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", ""); // Explicitly clear — prevents shell env leaking into test

    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    expect(response.status).toBe(500);
    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_PROVIDER_ERROR");
  });

  it("returns LLM_JSON_PARSE_ERROR when model returns non-JSON", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const SENSITIVE_CONTENT = "INTERNAL_PROVIDER_DATA_SECRET_12345";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: SENSITIVE_CONTENT } }],
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        }),
        text: async () => "{}",
      }),
    );

    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    expect(response.status).toBe(500);

    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");

    // Critical: raw model content must NOT appear in the response body.
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain(SENSITIVE_CONTENT);
  });

  it("returns LLM_SCHEMA_VALIDATION_ERROR when model returns schema mismatch", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ routes: [{ invalid_field: "should fail" }] }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    expect(response.status).toBe(500);

    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_SCHEMA_VALIDATION_ERROR");
  });

  it("does not expose raw provider error text in 500 response", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const SENSITIVE_PROVIDER_INTERNAL = "sk-test-key-for-unit-test";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          `Unauthorized: invalid API key ${SENSITIVE_PROVIDER_INTERNAL}`,
        json: async () => ({}),
      }),
    );

    const response = await POST(makeRequest({ normalizedBrief, strategicTension }));
    expect(response.status).toBe(500);

    const bodyText = await response.text();
    // Must not contain raw provider error message or the API key.
    expect(bodyText).not.toContain(SENSITIVE_PROVIDER_INTERNAL);
    expect(bodyText).not.toContain("Unauthorized");
  });
});
