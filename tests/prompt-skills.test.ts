// Tests that composed prompt output includes the correct skill sections.
// Uses composePrompt so tests validate the runtime output, not raw files.

import { describe, expect, it } from "vitest";
import { composePrompt } from "@/lib/prompts/compose-prompt";

describe("normalize_brief.md — brief distillation skill", () => {
  it("includes Brief Distillation Skill section", async () => {
    const prompt = await composePrompt("normalize_brief.md");
    expect(prompt).toContain("Brief Distillation Skill");
  });

  it("instructs to flag unknowns instead of filling gaps", async () => {
    const prompt = await composePrompt("normalize_brief.md");
    expect(prompt.toLowerCase()).toContain("flag");
  });
});

describe("extract_strategic_tension.md — brief distillation + cultural strategy skills", () => {
  it("includes Brief Distillation Skill section", async () => {
    const prompt = await composePrompt("extract_strategic_tension.md");
    expect(prompt).toContain("Brief Distillation Skill");
  });

  it("includes Cultural Strategy Skill section", async () => {
    const prompt = await composePrompt("extract_strategic_tension.md");
    expect(prompt).toContain("Cultural Strategy Skill");
  });

  it("includes tensionStatement format requirement", async () => {
    const prompt = await composePrompt("extract_strategic_tension.md");
    expect(prompt).toContain("Audience wants");
  });

  it("forbids generic premium vocabulary", async () => {
    const prompt = await composePrompt("extract_strategic_tension.md");
    expect(prompt.toLowerCase()).toMatch(/elevated.*sophisticated|sophisticated.*elevated|effortless/);
  });
});

describe("generate_campaign_routes.md — creative territory + cultural strategy skills", () => {
  it("includes Creative Territory Skill section", async () => {
    const prompt = await composePrompt("generate_campaign_routes.md");
    expect(prompt).toContain("Creative Territory Skill");
  });

  it("includes Cultural Strategy Skill section", async () => {
    const prompt = await composePrompt("generate_campaign_routes.md");
    expect(prompt).toContain("Cultural Strategy Skill");
  });

  it("forbids Effortless Elegance as a route name", async () => {
    const prompt = await composePrompt("generate_campaign_routes.md");
    expect(prompt).toContain("Effortless Elegance");
  });

  it("requires killer line to be poster-ready", async () => {
    const prompt = await composePrompt("generate_campaign_routes.md");
    expect(prompt.toLowerCase()).toContain("poster");
  });

  it("requires failure mode for every route", async () => {
    const prompt = await composePrompt("generate_campaign_routes.md");
    expect(prompt.toLowerCase()).toContain("failure mode");
  });
});

describe("simulate_audience_reactions.md — persona decision skill", () => {
  it("includes Persona Decision Skill section", async () => {
    const prompt = await composePrompt("simulate_audience_reactions.md");
    expect(prompt).toContain("Persona Decision Skill");
  });

  it("says reactions are planning hypotheses not real research", async () => {
    const prompt = await composePrompt("simulate_audience_reactions.md");
    expect(prompt.toLowerCase()).toContain("planning hypothes");
  });

  it("does not say synthetic reactions are real research", async () => {
    const prompt = await composePrompt("simulate_audience_reactions.md");
    expect(prompt.toLowerCase()).not.toMatch(/synthetic.*real research/);
  });

  it("requires bestCTA to be usable copy", async () => {
    const prompt = await composePrompt("simulate_audience_reactions.md");
    expect(prompt.toLowerCase()).toContain("usable copy");
  });
});

describe("premortem_review.md — premortem critic skill", () => {
  it("includes Premortem Critic Skill section", async () => {
    const prompt = await composePrompt("premortem_review.md");
    expect(prompt).toContain("Premortem Critic Skill");
  });

  it("instructs to be genuinely critical", async () => {
    const prompt = await composePrompt("premortem_review.md");
    expect(prompt.toLowerCase()).toContain("genuinely critical");
  });

  it("requires claims risk identification", async () => {
    const prompt = await composePrompt("premortem_review.md");
    expect(prompt.toLowerCase()).toContain("claims risk");
  });
});

describe("generate_execution_plan.md — creative territory + claims substantiation skills", () => {
  it("includes Creative Territory Skill section", async () => {
    const prompt = await composePrompt("generate_execution_plan.md");
    expect(prompt).toContain("Creative Territory Skill");
  });

  it("includes Claims Substantiation Skill section", async () => {
    const prompt = await composePrompt("generate_execution_plan.md");
    expect(prompt).toContain("Claims Substantiation Skill");
  });

  it("lists sustainability claims as a category requiring review", async () => {
    const prompt = await composePrompt("generate_execution_plan.md");
    expect(prompt.toLowerCase()).toContain("sustainability claim");
  });

  it("lists health/wellness claims", async () => {
    const prompt = await composePrompt("generate_execution_plan.md");
    expect(prompt.toLowerCase()).toContain("health");
  });

  it("says never imply legal approval", async () => {
    const prompt = await composePrompt("generate_execution_plan.md");
    expect(prompt.toLowerCase()).toContain("never imply legal");
  });
});
