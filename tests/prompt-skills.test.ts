// Tests that prompt files include the correct skill sections.
// Reads prompt files directly — no LLM calls, no mocks needed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function readPrompt(name: string): string {
  return readFileSync(path.join(process.cwd(), "prompts", name), "utf-8");
}

describe("normalize_brief.md — brief distillation skill", () => {
  const prompt = readPrompt("normalize_brief.md");

  it("includes Brief Distillation Skill section", () => {
    expect(prompt).toContain("Brief Distillation Skill");
  });

  it("instructs to flag unknowns instead of filling gaps", () => {
    expect(prompt.toLowerCase()).toContain("flag");
  });
});

describe("extract_strategic_tension.md — brief distillation + cultural strategy skills", () => {
  const prompt = readPrompt("extract_strategic_tension.md");

  it("includes Brief Distillation Skill section", () => {
    expect(prompt).toContain("Brief Distillation Skill");
  });

  it("includes Cultural Strategy Skill section", () => {
    expect(prompt).toContain("Cultural Strategy Skill");
  });

  it("includes tensionStatement format requirement", () => {
    expect(prompt).toContain("Audience wants");
  });

  it("forbids generic premium vocabulary", () => {
    expect(prompt.toLowerCase()).toMatch(/elevated.*sophisticated|sophisticated.*elevated|effortless/);
  });
});

describe("generate_campaign_routes.md — creative territory + cultural strategy skills", () => {
  const prompt = readPrompt("generate_campaign_routes.md");

  it("includes Creative Territory Skill section", () => {
    expect(prompt).toContain("Creative Territory Skill");
  });

  it("includes Cultural Strategy Skill section", () => {
    expect(prompt).toContain("Cultural Strategy Skill");
  });

  it("forbids Effortless Elegance as a route name", () => {
    expect(prompt).toContain("Effortless Elegance");
  });

  it("requires killer line to be poster-ready", () => {
    expect(prompt.toLowerCase()).toContain("poster");
  });

  it("requires failure mode for every route", () => {
    expect(prompt.toLowerCase()).toContain("failure mode");
  });
});

describe("simulate_audience_reactions.md — persona decision skill", () => {
  const prompt = readPrompt("simulate_audience_reactions.md");

  it("includes Persona Decision Skill section", () => {
    expect(prompt).toContain("Persona Decision Skill");
  });

  it("says reactions are planning hypotheses not real research", () => {
    expect(prompt.toLowerCase()).toContain("planning hypothes");
  });

  it("does not say synthetic reactions are real research", () => {
    expect(prompt.toLowerCase()).not.toMatch(/synthetic.*real research/);
  });

  it("requires bestCTA to be usable copy", () => {
    expect(prompt.toLowerCase()).toContain("usable copy");
  });
});

describe("premortem_review.md — premortem critic skill", () => {
  const prompt = readPrompt("premortem_review.md");

  it("includes Premortem Critic Skill section", () => {
    expect(prompt).toContain("Premortem Critic Skill");
  });

  it("instructs to be genuinely critical", () => {
    expect(prompt.toLowerCase()).toContain("genuinely critical");
  });

  it("requires claims risk identification", () => {
    expect(prompt.toLowerCase()).toContain("claims risk");
  });
});

describe("generate_execution_plan.md — creative territory + claims substantiation skills", () => {
  const prompt = readPrompt("generate_execution_plan.md");

  it("includes Creative Territory Skill section", () => {
    expect(prompt).toContain("Creative Territory Skill");
  });

  it("includes Claims Substantiation Skill section", () => {
    expect(prompt).toContain("Claims Substantiation Skill");
  });

  it("lists sustainability claims as a category requiring review", () => {
    expect(prompt.toLowerCase()).toContain("sustainability claim");
  });

  it("lists health/wellness claims", () => {
    expect(prompt.toLowerCase()).toContain("health");
  });

  it("says never imply legal approval", () => {
    expect(prompt.toLowerCase()).toContain("never imply legal");
  });
});
