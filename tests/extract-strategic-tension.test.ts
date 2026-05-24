import { afterEach, describe, expect, it, vi } from "vitest";
import { extractStrategicTensionStage } from "@/lib/workflow/stages/extract-strategic-tension";
import { strategicTensionSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import { normalizedBrief as MOCK_NORMALIZED_BRIEF } from "@/lib/workflow/mock-campaign-run";

// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
};

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

describe("extractStrategicTensionStage – mock mode", () => {
  it("returns a result with strategicTension and traceEvent", async () => {
    const result = await extractStrategicTensionStage(SAMPLE_INPUT);
    expect(result.strategicTension).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against strategicTensionSchema", async () => {
    const { strategicTension } = await extractStrategicTensionStage(SAMPLE_INPUT);
    expect(() => strategicTensionSchema.parse(strategicTension)).not.toThrow();
    expect(strategicTension.coreTension).toBeTruthy();
    expect(strategicTension.avoid.length).toBeGreaterThan(0);
  });

  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await extractStrategicTensionStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, promptVersion, and costUsd", async () => {
    const { traceEvent } = await extractStrategicTensionStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-strategic-tension");
    expect(traceEvent.promptVersion).toBe("extract_strategic_tension.v1");
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is extract_strategic_tension and status is completed", async () => {
    const { traceEvent } = await extractStrategicTensionStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("extract_strategic_tension");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId in the trace event", async () => {
    const { traceEvent } = await extractStrategicTensionStage({
      ...SAMPLE_INPUT,
      runId: "run-tension-test-123",
    });
    expect(traceEvent.runId).toBe("run-tension-test-123");
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces a typed error
// ---------------------------------------------------------------------------

describe("extractStrategicTensionStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Mock fetch to return valid JSON that fails schema validation.
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
    await expect(
      extractStrategicTensionStage(SAMPLE_INPUT),
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
                content: "Here is the strategic tension analysis for your campaign...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      extractStrategicTensionStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set — env.openaiApiKey will be "".

    await expect(
      extractStrategicTensionStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
