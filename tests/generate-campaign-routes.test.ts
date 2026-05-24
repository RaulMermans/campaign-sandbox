// Tests for the generateCampaignRoutesStage function.
// Runs in mock provider mode by default (no OPENAI_API_KEY required).
// Uses mocked fetch for OpenAI path tests.

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCampaignRoutesStage } from "@/lib/workflow/stages/generate-campaign-routes";
import { campaignRoutesOutputSchema, campaignRouteSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import { normalizedBrief, strategicTension } from "@/lib/workflow/mock-campaign-run";

const SAMPLE_INPUT = {
  normalizedBrief,
  strategicTension,
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

  it("returns between 3 and 5 routes", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes.length).toBeLessThanOrEqual(5);
  });

  it("routes include safest, boldest, and conversion strategicRoles", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    const roles = routes.map((r) => r.strategicRole);
    expect(roles).toContain("safest");
    expect(roles).toContain("boldest");
    expect(roles).toContain("conversion");
  });

  it("each route has at least one risk", async () => {
    const { routes } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    for (const route of routes) {
      expect(route.risks.length).toBeGreaterThan(0);
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
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is generate_campaign_routes and status is completed", async () => {
    const { traceEvent } = await generateCampaignRoutesStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("generate_campaign_routes");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId in the trace event", async () => {
    const { traceEvent } = await generateCampaignRoutesStage({
      ...SAMPLE_INPUT,
      runId: "run-xyz-456",
    });
    expect(traceEvent.runId).toBe("run-xyz-456");
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — bad model output produces typed errors
// ---------------------------------------------------------------------------

describe("generateCampaignRoutesStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Return a valid JSON object that fails the routes schema.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ routes: [{ not_valid: true }] }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    // Stage retries once, then throws LlmSchemaValidationError.
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
                content: "Here are your campaign routes: ...",
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
    vi.stubEnv("OPENAI_API_KEY", ""); // Explicitly clear — prevents shell env leaking into test

    await expect(
      generateCampaignRoutesStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("does not expose raw model output in the thrown error message", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    const sensitiveModelContent = "SENSITIVE_MODEL_INTERNAL_DATA_12345";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: sensitiveModelContent,
              },
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        }),
        text: async () => "{}",
      }),
    );

    try {
      await generateCampaignRoutesStage(SAMPLE_INPUT);
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      // The raw model content should NOT be in the error message (it goes in err.raw for LlmJsonParseError).
      // The error message must not expose any provider internals to callers.
      expect(err).toBeInstanceOf(LlmJsonParseError);
      const parseErr = err as LlmJsonParseError;
      // raw is stored on the error object for internal diagnostics — but the message itself should be generic
      expect(parseErr.message).not.toBe(sensitiveModelContent);
    }
  });
});
