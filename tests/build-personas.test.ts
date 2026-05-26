// Tests for buildPersonasStage.
// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".
// OpenAI paths use mocked fetch — no real API calls are made.

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPersonasStage } from "@/lib/workflow/stages/build-personas";
import { personaSchema, personasOutputSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
} from "@/lib/workflow/mock-campaign-run";

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
};

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

describe("buildPersonasStage – mock mode", () => {
  it("returns a result with personas and traceEvent", async () => {
    const result = await buildPersonasStage(SAMPLE_INPUT);
    expect(result.personas).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("personas array has 3–6 items", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    expect(personas.length).toBeGreaterThanOrEqual(3);
    expect(personas.length).toBeLessThanOrEqual(6);
  });

  it("output validates against personasOutputSchema", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    expect(() => personasOutputSchema.parse({ personas })).not.toThrow();
  });

  it("each persona validates against personaSchema", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    for (const persona of personas) {
      expect(() => personaSchema.parse(persona)).not.toThrow();
    }
  });

  it("persona IDs are unique", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    const ids = personas.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each persona has at least one motivation", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    for (const persona of personas) {
      expect(persona.motivations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each persona has at least one sensitivity", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    for (const persona of personas) {
      expect(persona.sensitivities.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each persona has at least one likelyChannel", async () => {
    const { personas } = await buildPersonasStage(SAMPLE_INPUT);
    for (const persona of personas) {
      expect(persona.likelyChannels.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await buildPersonasStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const { traceEvent } = await buildPersonasStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-persona-builder");
    expect(traceEvent.promptVersion).toBe("build_personas.v1");
  });

  it("trace event has costUsd: 0 in mock mode", async () => {
    const { traceEvent } = await buildPersonasStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is build_personas and status is completed", async () => {
    const { traceEvent } = await buildPersonasStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("build_personas");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId and preserves it in the trace event", async () => {
    const { traceEvent } = await buildPersonasStage({
      ...SAMPLE_INPUT,
      runId: "run-personas-test-789",
    });
    expect(traceEvent.runId).toBe("run-personas-test-789");
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces typed errors
// ---------------------------------------------------------------------------

describe("buildPersonasStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Return valid JSON that fails schema validation (missing required persona fields).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ personas: [{ not_a_valid_field: true }] }),
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
      buildPersonasStage(SAMPLE_INPUT),
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
                content: "Here are some personas for your campaign...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      buildPersonasStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set — env.openaiApiKey will be "".

    await expect(
      buildPersonasStage(SAMPLE_INPUT),
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
      buildPersonasStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
