// Tests for the POST /api/campaign/tension route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode (no OPENAI_API_KEY required).

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/campaign/tension/route";
import { strategicTensionSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import { normalizedBrief as MOCK_NORMALIZED_BRIEF } from "@/lib/workflow/mock-campaign-run";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/tension", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/tension – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/tension", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects a body missing the normalizedBrief field", async () => {
    const response = await POST(makeRequest({ something: "else" }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain("normalizedBrief");
  });

  it("rejects an invalid normalizedBrief (missing required fields)", async () => {
    const response = await POST(makeRequest({ normalizedBrief: { brandName: "Test" } }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid normalizedBrief.");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects a null normalizedBrief", async () => {
    const response = await POST(makeRequest({ normalizedBrief: null }));
    expect(response.status).toBe(400);
  });

  it("rejects an empty object as normalizedBrief", async () => {
    const response = await POST(makeRequest({ normalizedBrief: {} }));
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/tension – mock provider mode", () => {
  it("returns 200 with a valid strategicTension and traceEvent", async () => {
    const response = await POST(
      makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }),
    );
    expect(response.status).toBe(200);

    const body = await response.json() as {
      strategicTension: unknown;
      traceEvent: unknown;
    };
    expect(body.strategicTension).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("strategicTension validates against strategicTensionSchema", async () => {
    const response = await POST(
      makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }),
    );
    const body = await response.json() as { strategicTension: unknown };
    expect(() => strategicTensionSchema.parse(body.strategicTension)).not.toThrow();
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(
      makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }),
    );
    const body = await response.json() as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock and correct stageId", async () => {
    const response = await POST(
      makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }),
    );
    const body = await response.json() as {
      traceEvent: { provider: string; stageId: string; promptVersion: string };
    };
    expect(body.traceEvent.provider).toBe("mock");
    expect(body.traceEvent.stageId).toBe("extract_strategic_tension");
    expect(body.traceEvent.promptVersion).toBe("extract_strategic_tension.v1");
  });

  it("response does not expose raw provider output fields", async () => {
    const response = await POST(
      makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }),
    );
    const body = await response.json() as Record<string, unknown>;
    // Only these two fields should be present at top level.
    expect(Object.keys(body).sort()).toEqual(["strategicTension", "traceEvent"].sort());
  });
});

// ---------------------------------------------------------------------------
// OpenAI error sanitization — raw provider output must not be exposed
// ---------------------------------------------------------------------------

describe("POST /api/campaign/tension – OpenAI error sanitization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns sanitized error and does not expose raw provider output on API failure", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "internal error with sensitive provider detail",
      }),
    );

    const response = await POST(makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }));
    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;

    expect(body.code).toBe("LLM_PROVIDER_ERROR");
    expect(body.error).toBe("LLM stage failed.");

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("internal error with sensitive provider detail");
    expect(bodyStr).not.toContain("sk-test-key-for-unit-test");
  });

  it("returns sanitized LLM_JSON_PARSE_ERROR and does not expose raw model output on bad JSON", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const rawModelOutput = "Here is the strategic tension for your campaign...";
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

    const response = await POST(makeRequest({ normalizedBrief: MOCK_NORMALIZED_BRIEF }));
    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;

    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain(rawModelOutput);
  });
});
