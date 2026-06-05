// Server-side only. Do not import in client components or pages.
// Calls a real LLM provider and validates the response against a Zod schema.
// Only supports provider "openai". Mock paths must bypass this module entirely.

import type { ZodTypeAny, infer as ZodInfer } from "zod";
import { env } from "@/lib/env";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
  LlmTimeoutError,
} from "@/lib/llm/errors";

export interface GenerateJsonOptions<T extends ZodTypeAny> {
  /** Full prompt text to send to the model. Must instruct the model to return JSON only. */
  prompt: string;
  /** Zod schema to validate and parse the model response. */
  schema: T;
  /** Model ID override. Defaults to env.openaiModel. */
  model?: string;
  /** Request timeout in milliseconds. Defaults to 120_000ms. */
  timeoutMs?: number;
  /** JSON Schema name for providers that support structured outputs. */
  responseSchemaName?: string;
  /** JSON Schema for providers that support structured outputs. */
  jsonSchema?: Record<string, unknown>;
}

export interface GenerateJsonResult<T> {
  data: T;
  model: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}

type OpenAIResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        strict: true;
        schema: Record<string, unknown>;
      };
    };

type OpenAIResponse = {
  choices: Array<{ message: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

/**
 * Call OpenAI with JSON mode and validate the response against the provided schema.
 * Throws typed errors on API failure, JSON parse failure, or schema validation failure.
 * Never returns unvalidated model output.
 */
export async function generateJson<T extends ZodTypeAny>(
  options: GenerateJsonOptions<T>,
): Promise<GenerateJsonResult<ZodInfer<T>>> {
  if (env.provider !== "openai") {
    throw new LlmProviderError(
      `generateJson is only for real providers. Provider "${env.provider}" must use the mock path.`,
    );
  }

  const apiKey = env.openaiApiKey;
  if (!apiKey) {
    throw new LlmProviderError(
      "OPENAI_API_KEY is required when CAMPAIGN_SANDBOX_LLM_PROVIDER=openai. " +
        "Add it to your .env.local file. The app will build without it, but API calls will fail.",
    );
  }

  const model = options.model ?? env.openaiModel;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const responseFormat: OpenAIResponseFormat = options.jsonSchema
    ? {
        type: "json_schema",
        json_schema: {
          name: options.responseSchemaName ?? "campaign_stage_output",
          strict: true,
          schema: options.jsonSchema,
        },
      }
    : { type: "json_object" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: globalThis.Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: options.prompt }],
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError(`Request timed out after ${timeoutMs}ms.`);
    }
    throw new LlmProviderError(`Network error calling OpenAI: ${String(err)}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const text = await response.text();
    throw new LlmProviderError(
      `OpenAI API error ${response.status}: ${text.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as OpenAIResponse;
  const message = json.choices?.[0]?.message;
  if (message?.refusal) {
    throw new LlmProviderError("OpenAI refused to produce the requested JSON output.");
  }

  const content = message?.content;

  if (!content) {
    throw new LlmProviderError("OpenAI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Do not log content — it may contain sensitive brief text.
    throw new LlmJsonParseError(
      "Failed to parse JSON from OpenAI response. The model may have returned non-JSON text.",
      content,
    );
  }

  const result = options.schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));

    throw new LlmSchemaValidationError(
      "LLM output did not match expected schema.",
      issues,
    );
  }

  return {
    data: result.data as ZodInfer<T>,
    model,
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
  };
}
