// Tests for proof integrity in execution plan outputs.
// No LLM calls. Tests the deterministic guardrail against mock plan data.

import { describe, expect, it } from "vitest";
import {
  validateProofIntegrity,
  hasBlockingProofIntegrityIssues,
} from "@/lib/workflow/quality/validate-proof-integrity";
import {
  normalizedBrief as MOCK_BRIEF,
  campaignRoutes as MOCK_ROUTES,
  buildMockCompletedCampaignRun,
} from "@/lib/workflow/mock-campaign-run";
import { composePrompt } from "@/lib/prompts/compose-prompt";

async function loadExecutionPlanPrompt(): Promise<string> {
  return composePrompt("generate_execution_plan.md");
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

  it("prompt includes Claims Substantiation Skill (via skill composition)", async () => {
    const prompt = await loadExecutionPlanPrompt();
    expect(prompt).toContain("Claims Substantiation Skill");
  });

  it("prompt includes Creative Territory Skill (via skill composition)", async () => {
    const prompt = await loadExecutionPlanPrompt();
    expect(prompt).toContain("Creative Territory Skill");
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

describe("hasBlockingProofIntegrityIssues helper", () => {
  it("returns true when there are error-severity issues", () => {
    const issues = [{ field: "assetList", severity: "error" as const, message: "Unsupported proof." }];
    expect(hasBlockingProofIntegrityIssues(issues)).toBe(true);
  });

  it("returns false for warning-only issues", () => {
    const issues = [{ field: "assetList", severity: "warning" as const, message: "Minor concern." }];
    expect(hasBlockingProofIntegrityIssues(issues)).toBe(false);
  });

  it("returns false for empty issues array", () => {
    expect(hasBlockingProofIntegrityIssues([])).toBe(false);
  });
});

describe("mock execution plan – proof integrity", () => {
  it("mock execution plan passes proof integrity with mock brief", () => {
    const mockRun = buildMockCompletedCampaignRun("route-quiet-itinerary");
    const plan = mockRun.executionPlan;
    if (!plan) throw new Error("Mock plan missing");

    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: MOCK_ROUTES.filter((r) => r.id === "route-quiet-itinerary"),
      executionPlan: plan,
    });

    expect(hasBlockingProofIntegrityIssues(issues)).toBe(false);
  });

  it("all mock routes pass proof integrity with mock brief", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: MOCK_BRIEF,
      routes: MOCK_ROUTES,
    });
    expect(hasBlockingProofIntegrityIssues(issues)).toBe(false);
  });

  it("brief with explicit customer proof allows testimonial language", () => {
    const briefWithProof = {
      ...MOCK_BRIEF,
      brandDescription: "Brand with existing customer testimonials and verified reviews.",
    };
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithProof,
      executionPlan: {
        selectedRouteId: "route-test",
        planTitle: "Test",
        strategicSummary: "Video series with real customer testimonials.",
        assumptions: [],
        launchPhases: [{ phase: "Launch", objective: "Sales", timing: "Week 1", keyActions: ["Go live"], deliverables: ["Campaign"] }],
        channelPlan: [{ channel: "Instagram", role: "Primary", recommendedAssets: ["stills"] }],
        assetList: ["real customer testimonials video series"],
        copyExamples: ["Great"],
        measurementPlan: [{ metric: "Sales", purpose: "Revenue" }],
        heroVisualSystem: "Editorial.",
        shootList: ["Shot 1"],
        oohHeadlines: ["Headline"],
        paidSocialHooks: ["Hook"],
        landingPageBlocks: [{ block: "Hero", purpose: "Attention", content: "Copy" }],
        legalSubstantiationChecklist: ["Review all"],
        risksAndMitigations: [{ risk: "Risk", mitigation: "Fix" }],
        nextActions: ["Start"],
      },
    });
    expect(hasBlockingProofIntegrityIssues(issues)).toBe(false);
  });
});
