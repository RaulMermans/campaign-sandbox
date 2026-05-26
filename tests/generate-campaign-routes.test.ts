// Tests for generateCampaignRoutesStage.
// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".
// OpenAI paths use mocked fetch — no real API calls are made.

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCampaignRoutesStage } from "@/lib/workflow/stages/generate-campaign-routes";
import { campaignRouteSchema, campaignRoutesOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
} from "@/lib/workflow/mock-campaign-run";

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
};

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

describe("generateCampaignRoutesStage – mock mode", () => {
  it("returns a result with routes and traceEvent", async () => {
    const result = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(result.routes).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("routes array has 3–5 items", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes.length).toBeLessThanOrEqual(5);
  });

  it("output validates against campaignRoutesOutputSchema", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(() => campaignRoutesOutputSchema.parse({ routes })).not.toThrow();
  });

  it("each route validates against campaignRouteSchema", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    for (const route of routes) {
      expect(() => campaignRouteSchema.parse(route)).not.toThrow();
    }
  });

  it("routes include at least one safest, boldest, and conversion role", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    const roles = routes.map((r) => r.strategicRole);
    expect(roles).toContain("safest");
    expect(roles).toContain("boldest");
    expect(roles).toContain("conversion");
  });

  it("each route has at least one risk", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    for (const route of routes) {
      expect(route.risks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const { traceEvent } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-route-generator");
    expect(traceEvent.promptVersion).toBe("generate_campaign_routes.v1");
  });

  it("trace event has costUsd: 0 in mock mode", async () => {
    const { traceEvent } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is generate_campaign_routes and status is completed", async () => {
    const { traceEvent } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("generate_campaign_routes");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId and preserves it in the trace event", async () => {
    const { traceEvent } = await generateCampaignRoutesStage({
      ...SAMPLE_INPUT,
      runId: "run-routes-test-456",
    });
    expect(traceEvent.runId).toBe("run-routes-test-456");
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces typed errors
// ---------------------------------------------------------------------------

describe("generateCampaignRoutesStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Return valid JSON that fails schema validation (missing required route fields).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ routes: [{ not_a_valid_field: true }] }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    // Stage retries once then throws LlmSchemaValidationError.
    await expect(
      generateCampaignRoutesStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmSchemaValidationError);
  });

  it("throws LlmJsonParseError when model returns non-JSON content", async () => {
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
                content: "Here are some campaign routes for your brand...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      generateCampaignRoutesStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set — env.openaiApiKey will be "".

    await expect(
      generateCampaignRoutesStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError when the OpenAI API returns a non-OK response", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limit exceeded",
      }),
    );

    await expect(
      generateCampaignRoutesStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
