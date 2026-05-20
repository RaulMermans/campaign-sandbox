import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadPrompt(promptName: string) {
  if (!/^[a-z0-9_]+\.md$/.test(promptName)) {
    throw new Error("Prompt names must be lowercase markdown files.");
  }

  return readFile(path.join(process.cwd(), "prompts", promptName), "utf8");
}
