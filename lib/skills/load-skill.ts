import fs from "node:fs";
import path from "node:path";

const skillsDir = path.join(process.cwd(), "lib", "skills");

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

function loadSkill(name: string): string {
  const filePath = path.join(skillsDir, `${name}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return stripFrontmatter(raw);
}

export const skills = {
  briefDistillation: loadSkill("brief-distillation"),
  culturalStrategy: loadSkill("cultural-strategy"),
  creativeTerritory: loadSkill("creative-territory"),
  personaDecision: loadSkill("persona-decision"),
  premortemCritic: loadSkill("premortem-critic"),
  claimsSubstantiation: loadSkill("claims-substantiation"),
  reportEditor: loadSkill("report-editor"),
} as const;

export type SkillName = keyof typeof skills;
