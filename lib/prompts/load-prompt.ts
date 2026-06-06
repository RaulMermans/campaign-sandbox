import { composePrompt } from "@/lib/prompts/compose-prompt";

export async function loadPrompt(promptName: string): Promise<string> {
  return composePrompt(promptName);
}
