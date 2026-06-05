// Tests for lib/skills/ — verifies each skill file loads, is non-empty,
// and contains the content commitments from the sprint spec.

import { describe, expect, it } from "vitest";
import { skills } from "@/lib/skills/load-skill";

describe("skill files load and are non-empty", () => {
  it("briefDistillation exports non-empty content", () => {
    expect(skills.briefDistillation.length).toBeGreaterThan(100);
  });

  it("culturalStrategy exports non-empty content", () => {
    expect(skills.culturalStrategy.length).toBeGreaterThan(100);
  });

  it("creativeTerritory exports non-empty content", () => {
    expect(skills.creativeTerritory.length).toBeGreaterThan(100);
  });

  it("personaDecision exports non-empty content", () => {
    expect(skills.personaDecision.length).toBeGreaterThan(100);
  });

  it("premortemCritic exports non-empty content", () => {
    expect(skills.premortemCritic.length).toBeGreaterThan(100);
  });

  it("claimsSubstantiation exports non-empty content", () => {
    expect(skills.claimsSubstantiation.length).toBeGreaterThan(100);
  });

  it("reportEditor exports non-empty content", () => {
    expect(skills.reportEditor.length).toBeGreaterThan(100);
  });
});

describe("creativeTerritory skill — generic name avoidance", () => {
  const skill = skills.creativeTerritory;

  it("names Effortless Elegance as a forbidden route name", () => {
    expect(skill).toContain("Effortless Elegance");
  });

  it("names Urban Escape as a forbidden route name", () => {
    expect(skill).toContain("Urban Escape");
  });

  it("names Calm Curation as a forbidden route name", () => {
    expect(skill).toContain("Calm Curation");
  });

  it("names Premium Ritual as a forbidden route name", () => {
    expect(skill).toContain("Premium Ritual");
  });

  it("requires enemy definition", () => {
    expect(skill.toLowerCase()).toContain("enemy");
  });

  it("requires failure mode definition", () => {
    expect(skill.toLowerCase()).toContain("failure mode");
  });
});

describe("claimsSubstantiation skill — claim category coverage", () => {
  const skill = skills.claimsSubstantiation;

  it("covers time claims", () => {
    expect(skill.toLowerCase()).toContain("time claim");
  });

  it("covers sustainability claims", () => {
    expect(skill.toLowerCase()).toContain("sustainability claim");
  });

  it("covers savings claims", () => {
    expect(skill.toLowerCase()).toContain("savings claim");
  });

  it("covers health and wellness claims", () => {
    expect(skill.toLowerCase()).toMatch(/health.*(claim|wellness)/);
  });

  it("covers performance claims", () => {
    expect(skill.toLowerCase()).toContain("performance");
  });

  it("says never imply legal approval", () => {
    expect(skill.toLowerCase()).toContain("legal");
  });
});

describe("personaDecision skill — synthetic research caveat", () => {
  const skill = skills.personaDecision;

  it("states reactions are planning hypotheses", () => {
    expect(skill.toLowerCase()).toContain("planning hypothes");
  });

  it("states reactions are not real research", () => {
    expect(skill.toLowerCase()).toContain("not real");
  });

  it("requires caveat field to be present", () => {
    expect(skill.toLowerCase()).toContain("caveat");
  });
});

describe("premortemCritic skill — failure mode categories", () => {
  const skill = skills.premortemCritic;

  it("covers genericness risk", () => {
    expect(skill.toLowerCase()).toContain("genericness");
  });

  it("covers execution risk", () => {
    expect(skill.toLowerCase()).toContain("execution risk");
  });

  it("covers proof gaps", () => {
    expect(skill.toLowerCase()).toContain("proof gap");
  });

  it("covers channel mismatch", () => {
    expect(skill.toLowerCase()).toContain("channel mismatch");
  });

  it("covers claims risk", () => {
    expect(skill.toLowerCase()).toContain("claims risk");
  });
});
