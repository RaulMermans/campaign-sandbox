// Tests for the POST /api/campaign/normalize route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode (no OPENAI_API_KEY required).

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/campaign/normalize/route";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";

// A valid brief long enough to pass the 20-char minimum.
const VALID_BRIEF_TEXT =
  "Campaign for NOVA: sustainable urban clothing for creative professionals aged 25-35 in the UK. Budget GBP 5000-10000. Q1 next year. Tone: modern, clean, direct. No buzzwords or greenwashing.";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/normalize – input validation", () => {
  it("rejects a brief with text shorter than 20 characters", async () => {
    const response = await POST(makeRequest({ text: "Too short" }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid brief input.");
  });

  it("rejects a missing text field", async () => {
    const response = await POST(makeRequest({ source: "paste" }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid source enum value", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT, source: "clipboard" }));
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/normalize – mock provider mode", () => {
  it("returns 200 with a valid normalizedBrief and traceEvent", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT, source: "paste" }));
    expect(response.status).toBe(200);

    const body = await response.json() as { normalizedBrief: unknown; traceEvent: unknown };
    expect(body.normalizedBrief).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("normalizedBrief validates against normalizedCampaignBriefSchema", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { normalizedBrief: unknown };
    expect(() => normalizedCampaignBriefSchema.parse(body.normalizedBrief)).not.toThrow();
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("mock");
  });

  it("works without an explicit source field (defaults to paste)", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Error sanitization — raw provider output must not be exposed
// ---------------------------------------------------------------------------

describe("POST /api/campaign/normalize – error sanitization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns LLM_PROVIDER_ERROR code without raw provider output when API key missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", ""); // Explicitly clear — prevents shell env leaking into test

    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    expect(response.status).toBe(500);
    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_PROVIDER_ERROR");
  });

  it("returns LLM_JSON_PARSE_ERROR without raw model content when model returns non-JSON", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const SENSITIVE_CONTENT = "INTERNAL_MODEL_OUTPUT_SECRET_ABCDEF";

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

    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    expect(response.status).toBe(500);

    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_JSON_PARSE_ERROR");

    // Critical: raw model content must NOT appear in the response body.
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain(SENSITIVE_CONTENT);
  });

  it("returns LLM_SCHEMA_VALIDATION_ERROR when model output fails schema validation", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ not_a_valid_field: true }) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    expect(response.status).toBe(500);
    const body = await response.json() as { error: string; code: string };
    expect(body.error).toBe("LLM stage failed.");
    expect(body.code).toBe("LLM_SCHEMA_VALIDATION_ERROR");
  });
});
