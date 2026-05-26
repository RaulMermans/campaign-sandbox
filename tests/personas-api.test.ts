// Tests for the POST /api/campaign/personas route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode (no OPENAI_API_KEY required).

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/campaign/personas/route";
import { personaSchema, personasOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
} from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/personas", {
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

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/personas – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a body missing normalizedBrief", async () => {
    const response = await POST(makeRequest({
      strategicTension: MOCK_STRATEGIC_TENSION,
      routes: MOCK_CAMPAIGN_ROUTES,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain("normalizedBrief");
  });

  it("rejects a body missing strategicTension", async () => {
    const response = await POST(makeRequest({
      normalizedBrief: MOCK_NORMALIZED_BRIEF,
      routes: MOCK_CAMPAIGN_ROUTES,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain("strategicTension");
  });

  it("rejects a body missing routes", async () => {
    const response = await POST(makeRequest({
      normalizedBrief: MOCK_NORMALIZED_BRIEF,
      strategicTension: MOCK_STRATEGIC_TENSION,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain("routes");
  });

  it("rejects an invalid normalizedBrief (missing required fields)", async () => {
    const response = await POST(makeRequest({
      normalizedBrief: { brandName: "Test" },
      strategicTension: MOCK_STRATEGIC_TENSION,
      routes: MOCK_CAMPAIGN_ROUTES,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid normalizedBrief.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects an invalid strategicTension (missing required fields)", async () => {
    const response = await POST(makeRequest({
      normalizedBrief: MOCK_NORMALIZED_BRIEF,
      strategicTension: { coreTension: "only this" },
      routes: MOCK_CAMPAIGN_ROUTES,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid strategicTension.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects invalid routes (missing required route fields)", async () => {
    const response = await POST(makeRequest({
      normalizedBrief: MOCK_NORMALIZED_BRIEF,
      strategicTension: MOCK_STRATEGIC_TENSION,
      routes: [{ id: "bad-route" }],
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid routes.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects routes missing required strategic roles", async () => {
    // All routes have the same role — should fail the superRefine check.
    const allSafest = MOCK_CAMPAIGN_ROUTES.map((r) => ({
      ...r,
      strategicRole: "safest" as const,
    }));
    const response = await POST(makeRequest({
      normalizedBrief: MOCK_NORMALIZED_BRIEF,
      strategicTension: MOCK_STRATEGIC_TENSION,
      routes: allSafest,
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid routes.");
  });

  it("rejects an empty object body", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/personas – mock provider mode", () => {
  it("returns 200 with personas and traceEvent", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    const body = await response.json() as { personas: unknown; traceEvent: unknown };
    expect(body.personas).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("personas array validates against personasOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as { personas: unknown[] };
    expect(() => personasOutputSchema.parse({ personas: body.personas })).not.toThrow();
  });

  it("each persona validates against personaSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as { personas: unknown[] };
    for (const persona of body.personas) {
      expect(() => personaSchema.parse(persona)).not.toThrow();
    }
  });

  it("personas array has 3–6 items", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as { personas: unknown[] };
    expect(body.personas.length).toBeGreaterThanOrEqual(3);
    expect(body.personas.length).toBeLessThanOrEqual(6);
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock and correct stageId", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as {
      traceEvent: { provider: string; stageId: string; promptVersion: string };
    };
    expect(body.traceEvent.provider).toBe("mock");
    expect(body.traceEvent.stageId).toBe("build_personas");
    expect(body.traceEvent.promptVersion).toBe("build_personas.v1");
  });

  it("response only exposes personas and traceEvent at top level (no raw provider output)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = await response.json() as Record<string, unknown>;
    // Only these two fields should be present at top level.
    expect(Object.keys(body).sort()).toEqual(["personas", "traceEvent"].sort());
  });

  it("works without OPENAI_API_KEY env var (mock mode)", async () => {
    // No env vars set — defaults to mock provider.
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("accepts routes as an array directly (ergonomic wrapper)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// OpenAI error paths — sanitized error responses
// ---------------------------------------------------------------------------

describe("POST /api/campaign/personas – OpenAI error sanitization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns sanitized LLM_PROVIDER_ERROR and does not expose raw provider output on API failure", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "internal server error with sensitive detail",
      }),
    );

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;

    // Must use sanitized code, not raw provider text.
    expect(body.code).toBe("LLM_PROVIDER_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    // Must not expose raw provider text in the response.
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("internal server error with sensitive detail");
    expect(bodyStr).not.toContain("sk-test-key-for-unit-test");
  });

  it("returns sanitized LLM_JSON_PARSE_ERROR and does not expose raw model output on bad JSON", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const rawModelOutput = "Here is a long explanation of the personas I am generating...";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: rawModelOutput } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;

    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    // Must not expose raw model output to the client.
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain(rawModelOutput);
  });

  it("returns sanitized LLM_SCHEMA_VALIDATION_ERROR when model returns wrong schema", async () => {
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
                content: JSON.stringify({ personas: [{ secret_internal_field: "do not expose" }] }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;

    expect(body.code).toBe("LLM_SCHEMA_VALIDATION_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    // Must not expose raw model output (the invalid field value) to client.
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("secret_internal_field");
    expect(bodyStr).not.toContain("do not expose");
  });
});
