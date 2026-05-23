// Server-side only. Do not import in client components or pages.
// Thin wrapper around lib/env.ts for the LLM subsystem.

import { env, type LlmProvider } from "@/lib/env";

export type { LlmProvider };

export function getProvider(): LlmProvider {
  return env.provider;
}
