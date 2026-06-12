// Tests for the deterministic proof integrity guardrail.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import { validateProofIntegrity } from "@/lib/workflow/quality/validate-proof-integrity";
import {
  normalizedBrief as MOCK_BRIEF,
  campaignRoutes as MOCK_ROUTES,
  premortemReview as MOCK_PREMORTEM,
  buildMockCreativeDirectorReview,
} from "@/lib/workflow/mock-campaign-run";
import type {
  NormalizedCampaignBrief,
  CampaignRoute,
  PremortemReview,
  CampaignExecutionPlan,
  CreativeDirectorReview,
} from "@/lib/schemas/campaign";

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

describe("validateProofIntegrity – unsupported efficacy language flagged", () => {
  it("flags 'no crash' and 'proven' without brief support", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [
        {
          ...MOCK_ROUTES[0],
          id: "route-fake-efficacy",
          proofMechanism: "Proven to deliver results with no crash afterwards.",
        },
      ],
    });

    const proofIssues = issues.filter((i) => i.field.includes("proofMechanism"));
    expect(proofIssues.length).toBeGreaterThan(0);
    expect(proofIssues[0].severity).toBe("error");
  });

  it("flags 'survey-backed', 'validated by customers', and 'endorsements confirming' claims", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [
        { ...MOCK_ROUTES[0], id: "route-survey", proofMechanism: "Survey-backed claims of effectiveness." },
        { ...MOCK_ROUTES[0], id: "route-validated", proofMechanism: "Validated by customers across the category." },
        { ...MOCK_ROUTES[0], id: "route-endorsed", proofMechanism: "Endorsements confirming benefits from creators." },
      ],
    });

    expect(issues.filter((i) => i.field === "routes[route-survey].proofMechanism")).toHaveLength(1);
    expect(issues.filter((i) => i.field === "routes[route-validated].proofMechanism")).toHaveLength(1);
    expect(issues.filter((i) => i.field === "routes[route-endorsed].proofMechanism")).toHaveLength(1);
  });

  it("flags 'helps you regain your flow' and 'clear mental blocks'", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [
        {
          ...MOCK_ROUTES[0],
          id: "route-flow",
          activationIdeas: ["Helps you regain your flow during the afternoon slump."],
          assetIdeas: ["Copy that promises to clear mental blocks instantly."],
        },
      ],
    });

    expect(issues.some((i) => i.field.includes("activationIdeas"))).toBe(true);
    expect(issues.some((i) => i.field.includes("assetIdeas"))).toBe(true);
  });

  it("passes reframed efficacy language using safe qualifiers", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      routes: [
        {
          ...MOCK_ROUTES[0],
          id: "route-safe-efficacy",
          proofMechanism: "Positioned around perceived focus and refreshment — claims requiring substantiation before publication.",
          activationIdeas: ["Supports an afternoon reset ritual."],
          assetIdeas: ["Influencer-style demonstration if contracted and approved."],
        },
      ],
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

function baseExecutionPlan(): CampaignExecutionPlan {
  return {
    selectedRouteId: "route-test",
    planTitle: "Test Plan",
    strategicSummary: "A plan focused on the selected route's strategic territory.",
    assumptions: ["Synthetic audience reactions are planning hypotheses only."],
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
        notes: "Restrained cadence consistent with brand tone.",
      },
    ],
    assetList: ["hero editorial stills"],
    copyExamples: ["A quiet uniform for temporary coordinates."],
    measurementPlan: [{ metric: "Sales", purpose: "Track revenue" }],
    risksAndMitigations: [{ risk: "Budget risk", mitigation: "Review budget before production" }],
    nextActions: ["Confirm production timeline"],
    heroVisualSystem: "Clean editorial stills shot in natural light.",
    shootList: ["Shot 1: hero still"],
    oohHeadlines: ["Headline 1"],
    paidSocialHooks: ["Hook 1"],
    landingPageBlocks: [{ block: "Hero", purpose: "Attention", content: "Editorial hero copy." }],
    legalSubstantiationChecklist: ["Review all claims before publication."],
  };
}

describe("validateProofIntegrity – execution plan", () => {
  it("flags unsupported testimonials in execution plan asset list", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        strategicSummary: "A plan featuring real customer testimonials and verified customer reviews.",
        assetList: ["real customer testimonials video series"],
      },
    });

    const assetIssues = issues.filter((i) => i.field.includes("assetList"));
    expect(assetIssues.length).toBeGreaterThan(0);
  });
});

describe("validateProofIntegrity – execution plan expanded fields", () => {
  it("flags unsupported proof language in copyExamples", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        copyExamples: ["Backed by real customer testimonials from day one."],
      },
    });

    expect(issues.some((i) => i.field === "executionPlan.copyExamples")).toBe(true);
  });

  it("flags unsupported proof language in measurementPlan purpose", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        measurementPlan: [
          { metric: "Reviews", purpose: "Track verified testimonials submitted by real customers" },
        ],
      },
    });

    expect(issues.some((i) => i.field.startsWith("executionPlan.measurementPlan"))).toBe(true);
  });

  it("flags unsupported proof language in risksAndMitigations mitigation", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        risksAndMitigations: [
          { risk: "Low trust", mitigation: "Mitigate by featuring real customer testimonials prominently" },
        ],
      },
    });

    expect(issues.some((i) => i.field === "executionPlan.risksAndMitigations[].mitigation")).toBe(true);
  });

  it("flags unsupported proof language in nextActions", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        nextActions: ["Collect verified testimonials before launch"],
      },
    });

    expect(issues.some((i) => i.field === "executionPlan.nextActions")).toBe(true);
  });

  it("flags unsupported proof language in heroVisualSystem", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        heroVisualSystem: "Proven to convert, shot with real customers on location.",
      },
    });

    expect(issues.some((i) => i.field === "executionPlan.heroVisualSystem")).toBe(true);
  });

  it("flags unsupported proof language in shootList, oohHeadlines, and paidSocialHooks", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        shootList: ["Shoot real customer testimonials on set"],
        oohHeadlines: ["Proven to work, no crash."],
        paidSocialHooks: ["Helps you regain your flow instantly."],
      },
    });

    expect(issues.some((i) => i.field === "executionPlan.shootList")).toBe(true);
    expect(issues.some((i) => i.field === "executionPlan.oohHeadlines")).toBe(true);
    expect(issues.some((i) => i.field === "executionPlan.paidSocialHooks")).toBe(true);
  });

  it("flags unsupported proof language in landingPageBlocks content but not purpose", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        landingPageBlocks: [
          {
            block: "Social proof",
            purpose: "Reserve space for real customer submissions after launch",
            content: "Featuring real customer testimonials and verified customer reviews.",
          },
        ],
      },
    });

    expect(issues.some((i) => i.field.includes("landingPageBlocks") && i.field.includes("content"))).toBe(true);
    expect(issues.some((i) => i.field.includes("landingPageBlocks") && i.field.includes("purpose"))).toBe(false);
  });

  it("flags unsupported proof language in channelPlan notes", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        channelPlan: [
          {
            channel: "Instagram",
            role: "Primary channel",
            recommendedAssets: ["editorial stills"],
            notes: "Survey-backed engagement strategy.",
          },
        ],
      },
    });

    expect(issues.some((i) => i.field.includes("channelPlan") && i.field.includes("notes"))).toBe(true);
  });

  it("does not flag legalSubstantiationChecklist, which intentionally names claims requiring review", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: {
        ...baseExecutionPlan(),
        legalSubstantiationChecklist: [
          "Verify 'no crash' and 'proven' claims are substantiated before publication — currently unsupported.",
        ],
      },
    });

    expect(issues).toHaveLength(0);
  });

  it("passes a fully populated, safe execution plan", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      executionPlan: baseExecutionPlan(),
    });

    expect(issues).toHaveLength(0);
  });
});

function creativeDirectorReviewWithFakeProof(): CreativeDirectorReview {
  const base = buildMockCreativeDirectorReview(MOCK_ROUTES);

  return {
    ...base,
    overallVerdict: "Strong set — feature real customer testimonials across every route to prove it.",
    finalRecommendation: "Proceed with the boldest route and add verified customer reviews throughout.",
    crossRouteRecommendations: [
      ...base.crossRouteRecommendations,
      "Source user-generated content from real customers for every asset.",
    ],
    routesToAvoidOrMerge: [
      {
        routeId: base.routeReviews[0].routeId,
        reason: "Already showcases real customer testimonials, making it redundant with the boldest route.",
      },
    ],
    routeReviews: base.routeReviews.map((review, i) =>
      i === 0
        ? {
            ...review,
            why: "This route only works once it's backed by survey-backed proof points.",
            whatFeelsOwnable: ["Feature real customer testimonials front and center"],
            sharperKillerLines: ["Proven to help you regain your flow instantly."],
            creativeDirectorNotes: ["Add satisfied subscriber quotes to every variant."],
          }
        : review,
    ),
  };
}

describe("validateProofIntegrity – creative director review", () => {
  it("flags unsupported proof language across review fields", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      creativeDirectorReview: creativeDirectorReviewWithFakeProof(),
    });

    expect(issues.some((i) => i.field === "creativeDirectorReview.overallVerdict")).toBe(true);
    expect(issues.some((i) => i.field === "creativeDirectorReview.finalRecommendation")).toBe(true);
    expect(issues.some((i) => i.field === "creativeDirectorReview.crossRouteRecommendations")).toBe(true);
    expect(issues.some((i) => i.field.startsWith("creativeDirectorReview.routesToAvoidOrMerge"))).toBe(true);
    expect(issues.some((i) => i.field.endsWith(".why"))).toBe(true);
    expect(issues.some((i) => i.field.endsWith(".whatFeelsOwnable"))).toBe(true);
    expect(issues.some((i) => i.field.endsWith(".sharperKillerLines"))).toBe(true);
    expect(issues.some((i) => i.field.endsWith(".creativeDirectorNotes"))).toBe(true);
  });

  it("passes the mock creative director review, which uses no unsupported proof language", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      creativeDirectorReview: buildMockCreativeDirectorReview(MOCK_ROUTES),
    });

    expect(issues).toHaveLength(0);
  });

  it("allows creative director proof language when the brief substantiates it", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithProof(),
      creativeDirectorReview: creativeDirectorReviewWithFakeProof(),
    });

    expect(issues).toHaveLength(0);
  });
});

function premortemWithFakeProof(): PremortemReview {
  return {
    ...MOCK_PREMORTEM,
    summary: "Risk review covering all routes — mitigate weak resonance with real customer testimonials.",
    routeRisks: MOCK_PREMORTEM.routeRisks.map((rr, i) =>
      i === 0
        ? { ...rr, mitigations: ["Feature real customer testimonials and verified customer reviews up front"] }
        : rr,
    ),
    topFailureRisks: [
      {
        ...MOCK_PREMORTEM.topFailureRisks[0],
        mitigation: "Counter genericity by sourcing user-generated content and customer names and photos",
      },
      ...MOCK_PREMORTEM.topFailureRisks.slice(1),
    ],
  };
}

describe("validateProofIntegrity – pre-mortem review", () => {
  it("flags unsupported testimonial language in risk summary", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      premortemReview: premortemWithFakeProof(),
    });

    const summaryIssues = issues.filter((i) => i.field === "premortemReview.summary");
    expect(summaryIssues.length).toBeGreaterThan(0);
    expect(summaryIssues[0].severity).toBe("error");
  });

  it("flags unsupported proof language in route mitigations", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      premortemReview: premortemWithFakeProof(),
    });

    const mitigationIssues = issues.filter((i) => i.field.includes("routeRisks") && i.field.includes("mitigations"));
    expect(mitigationIssues.length).toBeGreaterThan(0);
  });

  it("flags unsupported proof language in top failure risk mitigations", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      premortemReview: premortemWithFakeProof(),
    });

    const failureIssues = issues.filter((i) => i.field === "premortemReview.topFailureRisks[].mitigation");
    expect(failureIssues.length).toBeGreaterThan(0);
  });

  it("passes the mock pre-mortem review, which uses no unsupported proof language", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithoutProof(),
      premortemReview: MOCK_PREMORTEM,
    });

    expect(issues).toHaveLength(0);
  });

  it("allows pre-mortem proof language when the brief substantiates it", () => {
    const issues = validateProofIntegrity({
      normalizedBrief: briefWithProof(),
      premortemReview: premortemWithFakeProof(),
    });

    expect(issues).toHaveLength(0);
  });
});
