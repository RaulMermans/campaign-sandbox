// Tests for POST /api/campaign/run route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock mode without any OPENAI_API_KEY.

import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";

// vi.mock calls are hoisted above imports by Vitest.
// Each mock preserves the original implementation as the default so existing tests pass,
// and allows mockRejectedValueOnce for targeted error injection tests.
vi.mock("@/lib/workflow/stages/normalize-brief", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workflow/stages/normalize-brief")>();
  return { normalizeBriefStage: vi.fn().mockImplementation(actual.normalizeBriefStage) };
});

vi.mock("@/lib/workflow/stages/score-routes-stage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workflow/stages/score-routes-stage")>();
  return { scoreRoutesStage: vi.fn().mockImplementation(actual.scoreRoutesStage) };
});

import { POST } from "@/app/api/campaign/run/route";
import { campaignRunOutputSchema } from "@/lib/schemas/campaign";
import type { CampaignRunOutput } from "@/lib/schemas/campaign";
import { normalizeBriefStage } from "@/lib/workflow/stages/normalize-brief";
import { scoreRoutesStage } from "@/lib/workflow/stages/score-routes-stage";
import { LlmSchemaValidationError, LlmProviderError } from "@/lib/llm/errors";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BRIEF =
  "This is a valid brief for a new fashion brand campaign targeting urban millennials with a capsule collection.";

const originalProvider = process.env.CAMPAIGN_SANDBOX_LLM_PROVIDER;
beforeAll(() => {
  process.env.CAMPAIGN_SANDBOX_LLM_PROVIDER = "mock";
});
afterAll(() => {
  if (originalProvider === undefined) {
    delete process.env.CAMPAIGN_SANDBOX_LLM_PROVIDER;
  } else {
    process.env.CAMPAIGN_SANDBOX_LLM_PROVIDER = originalProvider;
  }
});

// ---------------------------------------------------------------------------
// Input validation (fast — no workflow execution)
// ---------------------------------------------------------------------------

describe("POST /api/campaign/run – input validation", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body must be valid JSON.");
  });

  it("rejects missing 'text'", async () => {
    const response = await POST(makeRequest({ other: "field" }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("text");
  });

  it("rejects text shorter than 20 characters", async () => {
    const response = await POST(makeRequest({ text: "too short" }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("20 characters");
    // Verify error body does not contain raw stack trace lines.
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/\n\s+at\s+\w/);
  });

  it("rejects non-string text", async () => {
    const response = await POST(makeRequest({ text: 42 }));
    expect(response.status).toBe(400);
  });

  it("does not expose raw Error stack traces on bad input", async () => {
    const response = await POST(makeRequest({ text: "x" }));
    const bodyStr = await response.text();
    // Stack traces contain "    at " (indented with spaces before "at").
    expect(bodyStr).not.toMatch(/\n\s{2,}at\s+\w/);
  });
});

// ---------------------------------------------------------------------------
// Mock-mode response (runs the full chain once, shared across assertions)
// ---------------------------------------------------------------------------

describe("POST /api/campaign/run – mock mode", () => {
  let response: Response;
  let body: CampaignRunOutput;

  beforeAll(async () => {
    response = await POST(makeRequest({ text: VALID_BRIEF }));
    body = (await response.json()) as CampaignRunOutput;
  });

  it("returns 200 in mock mode", () => {
    expect(response.status).toBe(200);
  });

  it("response validates against campaignRunOutputSchema", () => {
    expect(() => campaignRunOutputSchema.parse(body)).not.toThrow();
  });

  it("response status is 'completed'", () => {
    expect(body.status).toBe("completed");
  });

  it("response includes normalizedBrief", () => {
    expect(body.normalizedBrief).toBeDefined();
  });

  it("response includes strategicTension", () => {
    expect(body.strategicTension).toBeDefined();
  });

  it("response includes routes (3–5 entries)", () => {
    expect(Array.isArray(body.routes)).toBe(true);
    expect(body.routes.length).toBeGreaterThanOrEqual(3);
    expect(body.routes.length).toBeLessThanOrEqual(5);
  });

  it("response includes personas", () => {
    expect(Array.isArray(body.personas)).toBe(true);
  });

  it("response includes simulations", () => {
    expect(Array.isArray(body.simulations)).toBe(true);
  });

  it("response includes scores", () => {
    expect(Array.isArray(body.scores)).toBe(true);
  });

  it("response includes premortemReview", () => {
    expect(body.premortemReview).toBeDefined();
  });

  it("response includes comparison", () => {
    expect(body.comparison).toBeDefined();
  });

  it("traceEvents includes all expected stage IDs", () => {
    const stageIds = body.traceEvents.map((e) => e.stageId);
    expect(stageIds).toContain("normalize_brief");
    expect(stageIds).toContain("extract_strategic_tension");
    expect(stageIds).toContain("generate_campaign_routes");
    expect(stageIds).toContain("build_personas");
    expect(stageIds).toContain("simulate_reactions");
    expect(stageIds).toContain("score_routes");
    expect(stageIds).toContain("premortem_review");
    expect(stageIds).toContain("compare_routes");
  });

  it("score_routes trace event shows provider 'deterministic'", () => {
    const scoreEvent = body.traceEvents.find((e) => e.stageId === "score_routes");
    expect(scoreEvent?.provider).toBe("deterministic");
  });

  it("compare_routes trace event shows provider 'deterministic'", () => {
    const compareEvent = body.traceEvents.find((e) => e.stageId === "compare_routes");
    expect(compareEvent?.provider).toBe("deterministic");
  });

  it("runId is a non-empty string", () => {
    expect(typeof body.runId).toBe("string");
    expect(body.runId.length).toBeGreaterThan(0);
  });

  it("comparison recommendedRouteId references a known route", () => {
    const routeIds = new Set(body.routes.map((r) => r.id));
    expect(routeIds.has(body.comparison.recommendedRouteId)).toBe(true);
  });

  it("works without OPENAI_API_KEY in mock mode", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await POST(makeRequest({ text: VALID_BRIEF }));
      expect(res.status).toBe(200);
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });
});

// ---------------------------------------------------------------------------
// Run mode: fast/deep
// ---------------------------------------------------------------------------

describe("POST /api/campaign/run – run mode", () => {
  it("accepts default (no mode specified) as fast mode and returns 200", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    expect(response.status).toBe(200);
  });

  it("accepts mode='fast' and returns 200", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "fast" }));
    expect(response.status).toBe(200);
  });

  it("accepts mode='deep' and returns 200", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "deep" }));
    expect(response.status).toBe(200);
  });

  it("rejects invalid mode", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "turbo" }));
    expect(response.status).toBe(400);
    const b = (await response.json()) as { error: string };
    expect(b.error).toContain("mode");
  });

  it("fast mode returns at most 3 routes", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "fast" }));
    expect(response.status).toBe(200);
    const b = (await response.json()) as CampaignRunOutput;
    expect(b.routes.length).toBeLessThanOrEqual(3);
  });

  it("fast mode returns at most 3 personas", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "fast" }));
    expect(response.status).toBe(200);
    const b = (await response.json()) as CampaignRunOutput;
    expect(b.personas.length).toBeLessThanOrEqual(3);
  });

  it("fast mode response validates against campaignRunOutputSchema", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "fast" }));
    const b = (await response.json()) as CampaignRunOutput;
    expect(() => campaignRunOutputSchema.parse(b)).not.toThrow();
  });

  it("trace events still include all expected stage IDs in fast mode", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF, mode: "fast" }));
    const b = (await response.json()) as CampaignRunOutput;
    const stageIds = b.traceEvents.map((e) => e.stageId);
    expect(stageIds).toContain("normalize_brief");
    expect(stageIds).toContain("extract_strategic_tension");
    expect(stageIds).toContain("generate_campaign_routes");
    expect(stageIds).toContain("build_personas");
    expect(stageIds).toContain("simulate_reactions");
    expect(stageIds).toContain("score_routes");
    expect(stageIds).toContain("premortem_review");
    expect(stageIds).toContain("compare_routes");
  });
});

// ---------------------------------------------------------------------------
// Stage-aware error handling
// ---------------------------------------------------------------------------

describe("POST /api/campaign/run – stage-aware errors", () => {
  it("schema validation error from normalize_brief returns stageId and LLM_SCHEMA_VALIDATION_ERROR", async () => {
    vi.mocked(normalizeBriefStage).mockRejectedValueOnce(
      new LlmSchemaValidationError("schema mismatch", [{ path: [], message: "bad" }]),
    );
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(422);
    expect(body.code).toBe("LLM_SCHEMA_VALIDATION_ERROR");
    expect(body.stageId).toBe("normalize_brief");
  });

  it("provider error from normalize_brief returns stageId and LLM_PROVIDER_ERROR", async () => {
    vi.mocked(normalizeBriefStage).mockRejectedValueOnce(
      new LlmProviderError("provider unavailable"),
    );
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(502);
    expect(body.code).toBe("LLM_PROVIDER_ERROR");
    expect(body.stageId).toBe("normalize_brief");
  });

  it("workflow validation error from score_routes returns stageId and WORKFLOW_VALIDATION_ERROR", async () => {
    vi.mocked(scoreRoutesStage).mockRejectedValueOnce(
      new WorkflowValidationError("scores invalid", [{ path: ["scores"], message: "missing" }]),
    );
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(422);
    expect(body.code).toBe("WORKFLOW_VALIDATION_ERROR");
    expect(body.stageId).toBe("score_routes");
  });

  it("stage error response does not include stack, cause, prompt, or raw provider output", async () => {
    vi.mocked(normalizeBriefStage).mockRejectedValueOnce(
      new LlmSchemaValidationError("schema mismatch", []),
    );
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    const bodyStr = await response.text();
    expect(bodyStr).not.toMatch(/\n\s{2,}at\s+\w/);
    expect(bodyStr).not.toContain('"stack"');
    expect(bodyStr).not.toContain('"cause"');
    expect(bodyStr).not.toContain('"prompt"');
  });

  it("successful mock-mode run still returns 200 after error tests", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF }));
    expect(response.status).toBe(200);
    const b = (await response.json()) as CampaignRunOutput;
    expect(() => campaignRunOutputSchema.parse(b)).not.toThrow();
  });
});
