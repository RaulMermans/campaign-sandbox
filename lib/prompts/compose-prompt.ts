// Server-side only. Do not import in client components.
// Composes a prompt file by replacing <!-- skill:name --> markers
// with loaded skill content from lib/skills.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { skills } from "@/lib/skills/load-skill";

const SKILL_MARKER_RE = /<!--\s*skill:([a-z0-9-]+)\s*-->/g;

const SKILL_MAP: Record<string, string> = {
  "brief-distillation": skills.briefDistillation,
  "cultural-strategy": skills.culturalStrategy,
  "creative-territory": skills.creativeTerritory,
  "persona-decision": skills.personaDecision,
  "premortem-critic": skills.premortemCritic,
  "claims-substantiation": skills.claimsSubstantiation,
  "report-editor": skills.reportEditor,
};

/**
 * Load and compose a prompt file, injecting skill content at <!-- skill:name --> markers.
 * Falls back gracefully: unknown skill markers throw in development (NODE_ENV !== production)
 * so drift is caught immediately.
 */
export async function composePrompt(promptName: string): Promise<string> {
  if (!/^[a-z0-9_]+\.md$/.test(promptName)) {
    throw new Error("Prompt names must be lowercase markdown files.");
  }

  const raw = await readFile(
    path.join(process.cwd(), "prompts", promptName),
    "utf8",
  );

  const resolved = raw.replace(SKILL_MARKER_RE, (fullMatch, skillName: string) => {
    const content = SKILL_MAP[skillName];
    if (content == null) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `composePrompt: unresolved skill marker <!-- skill:${skillName} --> in ${promptName}. ` +
            `Available skills: ${Object.keys(SKILL_MAP).join(", ")}.`,
        );
      }
      // In production, leave the marker unresolved rather than crashing
      return fullMatch;
    }
    return content;
  });

  // Verify no unresolved markers remain (dev guard)
  if (process.env.NODE_ENV !== "production") {
    const remaining = resolved.match(SKILL_MARKER_RE);
    if (remaining) {
      throw new Error(
        `composePrompt: unresolved skill markers after composition in ${promptName}: ${remaining.join(", ")}`,
      );
    }
  }

  return resolved;
}
