// Tests for proof integrity in execution plan outputs.
// No LLM calls. Tests the deterministic guardrail against mock plan data.

import { describe, expect, it } from "vitest";
import { validateProofIntegrity } from "@/lib/workflow/quality/validate-proof-integrity";
import {
  normalizedBrief as MOCK_BRIEF,
  campaignRoutes as MOCK_ROUTES,
} from "@/lib/workflow/mock-campaign-run";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadExecutionPlanPrompt(): Promise<string> {
  return readFile(
    path.join(process.cwd(), "prompts", "generate_execution_plan.md"),
    "utf8",
  );
}

describe("execution plan prompt – proof integrity rules", () => {
  it("prompt includes rule about not implying real customer proof", async () => {
    const prompt = await loadExecutionPlanPrompt();
    expect(prompt).toContain("Do NOT imply that real customer testimonials");
  });

  it("prompt includes 'testimonial-style creative' as allowed language", async () => {
    const prompt = await loadExecutionPlanPrompt();
    expect(prompt).toContain("testimonial-style creative");
  });

  it("prompt includes 'if available' as required qualifier", async () => {
    const prompt = await loadExecutionPlanPrompt();
    expect(prompt).toContain("if available");
  });
});

describe("proof integrity guardrail – execution plan validation", () => {
  it("flags execution plan with unsupported 'real customer testimonials' in asset list", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      executionPlan: {
        selectedRouteId: "route-test",
        planTitle: "Test Plan",
        strategicSummary: "Campaign summary.",
        assumptions: ["Synthetic reactions are planning hypotheses only."],
        launchPhases: [
          {
            phase: "Launch",
            objective: "Drive sales",
            timing: "Launch week",
            keyActions: ["Publish social content"],
            deliverables: ["Social posts"],
          },
        ],
        channelPlan: [
          { channel: "Instagram", role: "Primary", recommendedAssets: ["Editorial stills"] },
        ],
        assetList: ["Video series featuring real customer testimonials"],
        copyExamples: ["Great product"],
        measurementPlan: [{ metric: "Sales", purpose: "Track revenue" }],
        heroVisualSystem: "Editorial stills.",
        shootList: ["Shot 1"],
        oohHeadlines: ["Headline"],
        paidSocialHooks: ["Hook"],
        landingPageBlocks: [{ block: "Hero", purpose: "Attention", content: "Copy" }],
        legalSubstantiationChecklist: ["Review claims"],
        risksAndMitigations: [{ risk: "Risk", mitigation: "Mitigation" }],
        nextActions: ["Begin production"],
      },
    });

    const assetIssues = issues.filter((i) => i.field.includes("assetList"));
    expect(assetIssues.length).toBeGreaterThan(0);
    expect(assetIssues[0].severity).toBe("error");
  });

  it("passes execution plan using 'testimonial-style creative' language", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      executionPlan: {
        selectedRouteId: "route-test",
        planTitle: "Test Plan",
        strategicSummary: "Campaign using testimonial-style creative if available.",
        assumptions: ["Synthetic reactions are planning hypotheses only."],
        launchPhases: [
          {
            phase: "Launch",
            objective: "Drive sales",
            timing: "Launch week",
            keyActions: ["Publish editorial content"],
            deliverables: ["Editorial stills"],
          },
        ],
        channelPlan: [
          { channel: "Instagram", role: "Primary", recommendedAssets: ["Editorial stills"] },
        ],
        assetList: ["Scenario-based creative in city environments"],
        copyExamples: ["For days with more than one place in them."],
        measurementPlan: [{ metric: "Sales", purpose: "Track revenue" }],
        heroVisualSystem: "Editorial stills.",
        shootList: ["Shot 1"],
        oohHeadlines: ["Headline"],
        paidSocialHooks: ["Hook"],
        landingPageBlocks: [{ block: "Hero", purpose: "Attention", content: "Copy" }],
        legalSubstantiationChecklist: ["Review claims"],
        risksAndMitigations: [{ risk: "Risk", mitigation: "Mitigation" }],
        nextActions: ["Begin production"],
      },
    });

    expect(issues).toHaveLength(0);
  });
});
