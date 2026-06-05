import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmProviderError } from "@/lib/llm/errors";

const resultSchema = z.object({ ok: z.boolean() }).strict();
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok"],
  properties: {
    ok: { type: "boolean" },
  },
};

function mockOpenAIResponse(message: { content?: string | null; refusal?: string | null }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message }],
      usage: { prompt_tokens: 11, completion_tokens: 7 },
    }),
    text: async () => "{}",
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("generateJson OpenAI response_format", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends json_schema response_format when jsonSchema is provided", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");
    const fetchMock = mockOpenAIResponse({ content: JSON.stringify({ ok: true }) });

    const result = await generateJson({
      prompt: "Return JSON.",
      schema: resultSchema,
      responseSchemaName: "test_result",
      jsonSchema,
    });

    expect(result.data).toEqual({ ok: true });
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "test_result",
        strict: true,
        schema: jsonSchema,
      },
    });
  });

  it("falls back to json_object response_format when jsonSchema is not provided", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");
    const fetchMock = mockOpenAIResponse({ content: JSON.stringify({ ok: true }) });

    await generateJson({
      prompt: "Return JSON.",
      schema: resultSchema,
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.response_format).toEqual({ type: "json_object" });
  });

  it("throws a provider error when OpenAI returns a refusal", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");
    mockOpenAIResponse({ content: null, refusal: "I cannot comply." });

    await expect(
      generateJson({
        prompt: "Return JSON.",
        schema: resultSchema,
        jsonSchema,
      }),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
