// Server-side only. Do not import this module in client components or pages.
// It reads environment variables that must never be exposed to the browser.
// Never re-export values from this module through a NEXT_PUBLIC_ variable.

export type LlmProvider = "mock" | "openai";

const VALID_PROVIDERS: readonly LlmProvider[] = ["mock", "openai"];

function resolveProvider(): LlmProvider {
  const raw = process.env.CAMPAIGN_SANDBOX_LLM_PROVIDER ?? "mock";
  if (!VALID_PROVIDERS.includes(raw as LlmProvider)) {
    throw new Error(
      `Invalid CAMPAIGN_SANDBOX_LLM_PROVIDER: "${raw}". Must be "mock" or "openai".`,
    );
  }
  return raw as LlmProvider;
}

// Lazy getters: values are resolved at call time, not at import time.
// This avoids build-time failures when env vars are absent in CI or Vercel build phase.
export const env = {
  get provider(): LlmProvider {
    return resolveProvider();
  },
  get openaiApiKey(): string {
    return process.env.OPENAI_API_KEY ?? "";
  },
  get openaiModel(): string {
    return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  },
};
