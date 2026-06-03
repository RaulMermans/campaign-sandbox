import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeBriefStage } from "@/lib/workflow/stages/normalize-brief";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";

// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".

const SAMPLE_INPUT = {
  text: NODO_SAMPLE_BRIEF,
  source: "paste" as const,
} as const;

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

describe("normalizeBriefStage – mock mode", () => {
  it("returns a result with normalizedBrief and traceEvent", async () => {
    const result = await normalizeBriefStage(SAMPLE_INPUT);
    expect(result.normalizedBrief).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against normalizedCampaignBriefSchema", async () => {
    const { normalizedBrief } = await normalizeBriefStage(SAMPLE_INPUT);
    expect(() => normalizedCampaignBriefSchema.parse(normalizedBrief)).not.toThrow();
    expect(normalizedBrief.brandName).toBeTruthy();
    expect(normalizedBrief.objectives.length).toBeGreaterThan(0);
    expect(normalizedBrief.channels.length).toBeGreaterThan(0);
  });

  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await normalizeBriefStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, promptVersion, and costUsd", async () => {
    const { traceEvent } = await normalizeBriefStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-normalizer");
    expect(traceEvent.promptVersion).toBe("normalize_brief.v1");
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is normalize_brief and status is completed", async () => {
    const { traceEvent } = await normalizeBriefStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("normalize_brief");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId in the trace event", async () => {
    const { traceEvent } = await normalizeBriefStage(SAMPLE_INPUT, "run-abc-123");
    expect(traceEvent.runId).toBe("run-abc-123");
  });
});

// ---------------------------------------------------------------------------
// LLM error types
// ---------------------------------------------------------------------------

describe("LLM error types", () => {
  it("LlmProviderError is a proper Error with correct name", () => {
    const err = new LlmProviderError("Provider unavailable");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("LlmProviderError");
    expect(err.message).toBe("Provider unavailable");
  });

  it("LlmJsonParseError stores the raw response", () => {
    const err = new LlmJsonParseError("Failed to parse", "{ not json }");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("LlmJsonParseError");
    expect(err.raw).toBe("{ not json }");
  });

  it("LlmSchemaValidationError stores the issues array", () => {
    const issues = [{ path: ["brandName"], message: "Required" }];
    const err = new LlmSchemaValidationError("Schema mismatch", issues);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("LlmSchemaValidationError");
    expect(err.issues).toEqual(issues);
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces a typed error
// ---------------------------------------------------------------------------

describe("normalizeBriefStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError with safe issues when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Mock fetch to return a valid JSON structure that fails schema validation.
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

    // Stage retries once, then throws LlmSchemaValidationError.
    await expect(normalizeBriefStage(SAMPLE_INPUT)).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: ["brandName"],
          message: expect.any(String),
        }),
      ]),
    });
  });

  it("throws LlmJsonParseError when model returns non-JSON content", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Sure! Here is the normalized brief: ..." } }],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      normalizeBriefStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set — env.openaiApiKey will be "".

    await expect(
      normalizeBriefStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
