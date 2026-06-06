// Tests for the deterministic proof integrity guardrail.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import { validateProofIntegrity } from "@/lib/workflow/quality/validate-proof-integrity";
import {
  normalizedBrief as MOCK_BRIEF,
  campaignRoutes as MOCK_ROUTES,
} from "@/lib/workflow/mock-campaign-run";
import type { NormalizedCampaignBrief, CampaignRoute } from "@/lib/schemas/campaign";

function briefWithoutProof(): NormalizedCampaignBrief {
  return {
    ...MOCK_BRIEF,
    brandDescription: "Independent fashion brand with premium basics.",
    constraints: ["No fake airport shoot", "No limited drop shouting"],
  };
}

function briefWithProof(): NormalizedCampaignBrief {
  return {
    ...MOCK_BRIEF,
    brandDescription: "Independent fashion brand with existing customer testimonials and case studies.",
  };
}

function routeWithFakeProof(): CampaignRoute {
  return {
    ...MOCK_ROUTES[0],
    id: "route-fake-proof",
    proofMechanism:
      "Feature real customer testimonials showing how the product fits their day across Madrid and Lisbon.",
    activationIdeas: ["user-generated content submissions from real customers"],
    assetIdeas: ["customer names and photos for social proof"],
  };
}

function routeWithSafeProof(): CampaignRoute {
  return {
    ...MOCK_ROUTES[0],
    id: "route-safe-proof",
    proofMechanism:
      "Testimonial-style creative shot in real transitional city spaces — customer proof if available.",
    activationIdeas: ["scenario-based demonstrations of product in context"],
    assetIdeas: ["editorial stills in transitional city environments"],
  };
}

describe("validateProofIntegrity – unsupported testimonial language flagged", () => {
  it("flags 'real customer testimonials' in proof mechanism without brief support", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [routeWithFakeProof()],
    });

    const proofIssues = issues.filter((i) => i.field.includes("proofMechanism"));
    expect(proofIssues.length).toBeGreaterThan(0);
    expect(proofIssues[0].severity).toBe("error");
  });

  it("flags 'user-generated content' in activation ideas without brief support", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [routeWithFakeProof()],
    });

    const ugcIssues = issues.filter(
      (i) => i.field.includes("activationIdeas") && i.message.includes("real customer"),
    );
    expect(ugcIssues.length).toBeGreaterThan(0);
  });
});

describe("validateProofIntegrity – safe language passes", () => {
  it("passes testimonial-style creative with 'if available' qualifier", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [routeWithSafeProof()],
    });

    expect(issues).toHaveLength(0);
  });

  it("passes mock routes which do not claim real customer proof", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: MOCK_ROUTES,
    });

    expect(issues).toHaveLength(0);
  });
});

describe("validateProofIntegrity – brief with proof allows customer language", () => {
  it("returns no issues when brief explicitly provides customer proof", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithProof(),
      routes: [routeWithFakeProof()],
    });

    expect(issues).toHaveLength(0);
  });
});

describe("validateProofIntegrity – execution plan", () => {
  it("flags unsupported testimonials in execution plan asset list", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        selectedRouteId: "route-test",
        planTitle: "Test Plan",
        strategicSummary: "A plan featuring real customer testimonials and verified customer reviews.",
        assumptions: ["synthetic reactions are planning hypotheses only"],
        launchPhases: [
          {
            phase: "Launch",
            objective: "Drive sales",
            timing: "Launch week",
            keyActions: ["Publish campaign"],
            deliverables: ["Social content"],
          },
        ],
        channelPlan: [
          {
            channel: "Instagram",
            role: "Primary channel",
            recommendedAssets: ["editorial stills"],
          },
        ],
        assetList: ["real customer testimonials video series"],
        copyExamples: ["Great product"],
        measurementPlan: [{ metric: "Sales", purpose: "Track revenue" }],
        heroVisualSystem: "Clean editorial stills.",
        shootList: ["Shot 1"],
        oohHeadlines: ["Headline 1"],
        paidSocialHooks: ["Hook 1"],
        landingPageBlocks: [{ block: "Hero", purpose: "Attention", content: "Copy" }],
        legalSubstantiationChecklist: ["Review all claims"],
        risksAndMitigations: [{ risk: "Budget risk", mitigation: "Review budget" }],
        nextActions: ["Start production"],
      },
    });

    const assetIssues = issues.filter((i) => i.field.includes("assetList"));
    expect(assetIssues.length).toBeGreaterThan(0);
  });
});
