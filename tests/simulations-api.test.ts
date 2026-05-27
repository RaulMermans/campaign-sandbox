// Tests for the POST /api/campaign/simulations route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode (no OPENAI_API_KEY required).

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/campaign/simulations/route";
import {
  personaSimulationSchema,
  personaSimulationsOutputSchema,
} from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
} from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/simulations", {
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
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/simulations – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/simulations", {
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
    const response = await POST(
      makeRequest({
        strategicTension: MOCK_STRATEGIC_TENSION,
        routes: MOCK_CAMPAIGN_ROUTES,
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("normalizedBrief");
  });

  it("rejects a body missing strategicTension", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        routes: MOCK_CAMPAIGN_ROUTES,
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("strategicTension");
  });

  it("rejects a body missing routes", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        strategicTension: MOCK_STRATEGIC_TENSION,
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("routes");
  });

  it("rejects a body missing personas", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        strategicTension: MOCK_STRATEGIC_TENSION,
        routes: MOCK_CAMPAIGN_ROUTES,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("personas");
  });

  it("rejects an invalid normalizedBrief (missing required fields)", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: { brandName: "Test" },
        strategicTension: MOCK_STRATEGIC_TENSION,
        routes: MOCK_CAMPAIGN_ROUTES,
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid normalizedBrief.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects an invalid strategicTension (missing required fields)", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        strategicTension: { coreTension: "only this" },
        routes: MOCK_CAMPAIGN_ROUTES,
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid strategicTension.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects invalid routes (missing required route fields)", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        strategicTension: MOCK_STRATEGIC_TENSION,
        routes: [{ id: "bad-route" }],
        personas: MOCK_PERSONAS,
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid routes.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects invalid personas (missing required persona fields)", async () => {
    const response = await POST(
      makeRequest({
        normalizedBrief: MOCK_NORMALIZED_BRIEF,
        strategicTension: MOCK_STRATEGIC_TENSION,
        routes: MOCK_CAMPAIGN_ROUTES,
        personas: [{ id: "bad-persona" }],
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid personas.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects an empty object body", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/simulations – mock provider mode", () => {
  it("returns 200 with simulations and traceEvent", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      simulations: unknown;
      traceEvent: unknown;
    };
    expect(body.simulations).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("simulations array validates against personaSimulationsOutputSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { simulations: unknown[] };
    expect(() =>
      personaSimulationsOutputSchema.parse({ simulations: body.simulations }),
    ).not.toThrow();
  });

  it("each simulation validates against personaSimulationSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { simulations: unknown[] };
    for (const sim of body.simulations) {
      expect(() => personaSimulationSchema.parse(sim)).not.toThrow();
    }
  });

  it("simulations cover every route/persona pair (3 routes × 3 personas = 9)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      simulations: Array<{ routeId: string; personaId: string }>;
    };
    const expectedCount = MOCK_CAMPAIGN_ROUTES.length * MOCK_PERSONAS.length;
    expect(body.simulations.length).toBe(expectedCount);

    const pairs = new Set(
      body.simulations.map((s) => `${s.routeId}:${s.personaId}`),
    );
    expect(pairs.size).toBe(expectedCount);
  });

  it("every simulation caveat mentions synthetic", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      simulations: Array<{ caveat: string }>;
    };
    for (const sim of body.simulations) {
      expect(sim.caveat.toLowerCase()).toContain("synthetic");
    }
  });

  it("scores are bounded 1–5", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      simulations: Array<{
        resonanceScore: number;
        conversionIntent: number;
        signupIntent: number;
      }>;
    };
    for (const sim of body.simulations) {
      expect(sim.resonanceScore).toBeGreaterThanOrEqual(1);
      expect(sim.resonanceScore).toBeLessThanOrEqual(5);
      expect(sim.conversionIntent).toBeGreaterThanOrEqual(1);
      expect(sim.conversionIntent).toBeLessThanOrEqual(5);
      expect(sim.signupIntent).toBeGreaterThanOrEqual(1);
      expect(sim.signupIntent).toBeLessThanOrEqual(5);
    }
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock and correct stageId and promptVersion", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as {
      traceEvent: { provider: string; stageId: string; promptVersion: string };
    };
    expect(body.traceEvent.provider).toBe("mock");
    expect(body.traceEvent.stageId).toBe("simulate_reactions");
    expect(body.traceEvent.promptVersion).toBe("simulate_reactions.v1");
  });

  it("response only exposes simulations and traceEvent at top level (no raw provider output)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["simulations", "traceEvent"].sort());
  });

  it("works without OPENAI_API_KEY env var (mock mode)", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
  });

  it("accepts routes as a bare array (ergonomic wrapper)", async () => {
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        routes: MOCK_CAMPAIGN_ROUTES, // bare array
      }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts routes as { routes: [...] } wrapper object", async () => {
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        routes: { routes: MOCK_CAMPAIGN_ROUTES },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts personas as a bare array (ergonomic wrapper)", async () => {
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        personas: MOCK_PERSONAS, // bare array
      }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts personas as { personas: [...] } wrapper object", async () => {
    const response = await POST(
      makeRequest({
        ...VALID_BODY,
        personas: { personas: MOCK_PERSONAS },
      }),
    );
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// OpenAI error paths — sanitized error responses
// ---------------------------------------------------------------------------

describe("POST /api/campaign/simulations – OpenAI error sanitization", () => {
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
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.code).toBe("LLM_PROVIDER_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("internal server error with sensitive detail");
    expect(bodyStr).not.toContain("sk-test-key-for-unit-test");
  });

  it("returns sanitized LLM_JSON_PARSE_ERROR and does not expose raw model output on bad JSON", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const rawModelOutput =
      "Here is a detailed explanation of all the audience reactions I am generating...";
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
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");
    expect(body.error).toBe("LLM stage failed.");

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
                content: JSON.stringify({
                  simulations: [{ secret_internal_field: "do not expose" }],
                }),
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
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.code).toBe("LLM_SCHEMA_VALIDATION_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("secret_internal_field");
    expect(bodyStr).not.toContain("do not expose");
  });
});
