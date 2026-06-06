// Tests for the deterministic route quality validator.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import {
  validateRouteQuality,
  hasBlockingRouteQualityIssues,
} from "@/lib/workflow/quality/validate-route-quality";
import { campaignRoutes as MOCK_ROUTES } from "@/lib/workflow/mock-campaign-run";
import type { CampaignRoute } from "@/lib/schemas/campaign";

function baseRoute(overrides: Partial<CampaignRoute> = {}): CampaignRoute {
  return {
    id: "route-test",
    name: "The 7PM Reset",
    strategicRole: "safest",
    position: "A specific strategic position.",
    concept: "A specific creative concept grounded in the brief.",
    whyItWorks: "It works because of specific reasoning.",
    keyMessage: "A specific key message.",
    tone: ["calm", "precise"],
    channels: ["Instagram", "email"],
    activationIdeas: ["location notes series"],
    sampleCopy: ["Between places, properly dressed."],
    assetIdeas: ["tight environmental stills in real city spaces"],
    risks: ["May feel too subtle without strong photography"],
    enemy: "Generic travel aesthetics that romanticise transit",
    visualWorld: [
      "tight environmental stills — stairwells, cafe counters, studio windows at 4pm",
      "hands holding things: keys, espresso cups, notebooks — never posed",
    ],
    proofMechanism:
      "Garments shot in real transitional city spaces — no luggage, no horizon lines, no departure boards",
    channelFit: ["Instagram carousel"],
    killerLine: "For days with more than one place in them.",
    failureMode:
      "If the photography is merely pretty rather than precise, the route collapses into a generic lookbook and loses all strategic specificity",
    ...overrides,
  };
}

describe("validateRouteQuality – generic names flagged", () => {
  const genericNames = [
    "Effortless Elegance",
    "Urban Escape",
    "Calm Curation",
    "Premium Ritual",
    "Elevated Evening",
    "Modern Ritual",
    "Simple Choice",
  ];

  for (const name of genericNames) {
    it(`flags generic name: "${name}"`, () => {
      const route = baseRoute({ name });
      const issues = validateRouteQuality([route]);
      const nameIssues = issues.filter((i) => i.field === "name" && i.severity === "error");
      expect(nameIssues.length).toBeGreaterThan(0);
    });
  }
});

describe("validateRouteQuality – concrete names pass", () => {
  const concreteNames = [
    "The 7PM Reset",
    "Dinner Without the Negotiation",
    "The Quiet Return",
    "No More What's for Dinner",
    "The After-Work Exhale",
    "Between Addresses",
    "Quiet Itinerary",
    "Uniform for Motion",
  ];

  for (const name of concreteNames) {
    it(`passes concrete name: "${name}"`, () => {
      const route = baseRoute({ name });
      const issues = validateRouteQuality([route]);
      const nameErrors = issues.filter((i) => i.field === "name" && i.severity === "error");
      expect(nameErrors).toHaveLength(0);
    });
  }
});

describe("validateRouteQuality – visual world", () => {
  it("flags visual world with fewer than 2 concrete production details", () => {
    const route = baseRoute({
      visualWorld: ["moody and warm", "elegant and considered"],
    });
    const issues = validateRouteQuality([route]);
    const vwIssues = issues.filter((i) => i.field === "visualWorld");
    expect(vwIssues.length).toBeGreaterThan(0);
  });

  it("passes visual world with 2+ concrete sensory/production details", () => {
    const route = baseRoute({
      visualWorld: [
        "tight environmental stills — stairwells, cafe counters at 4pm",
        "hands holding espresso cups and notebooks — never posed",
      ],
    });
    const issues = validateRouteQuality([route]);
    const vwErrors = issues.filter((i) => i.field === "visualWorld" && i.severity === "error");
    expect(vwErrors).toHaveLength(0);
  });
});

describe("validateRouteQuality – fake testimonial proof flagged", () => {
  it("flags proof mechanism claiming real customer testimonials without qualification", () => {
    const route = baseRoute({
      proofMechanism: "Feature real customer testimonials showing how the product fits their day.",
    });
    const issues = validateRouteQuality([route]);
    const proofIssues = issues.filter((i) => i.field === "proofMechanism");
    expect(proofIssues.length).toBeGreaterThan(0);
  });

  it("passes proof mechanism using testimonial-style creative language", () => {
    const route = baseRoute({
      proofMechanism:
        "Testimonial-style creative showing recognisable city moments — customer proof if available.",
    });
    const issues = validateRouteQuality([route]);
    const proofErrors = issues.filter((i) => i.field === "proofMechanism" && i.severity === "error");
    expect(proofErrors).toHaveLength(0);
  });

  it("passes proof mechanism using scenario-based creative", () => {
    const route = baseRoute({
      proofMechanism: "Scenario-based creative showing product in use across three real city contexts.",
    });
    const issues = validateRouteQuality([route]);
    const proofErrors = issues.filter((i) => i.field === "proofMechanism" && i.severity === "error");
    expect(proofErrors).toHaveLength(0);
  });
});

describe("validateRouteQuality – vague failure mode", () => {
  it("warns on failure modes like 'may not resonate' with no explanation", () => {
    const route = baseRoute({
      failureMode: "May not resonate with the audience.",
    });
    const issues = validateRouteQuality([route]);
    const warnings = issues.filter((i) => i.field === "failureMode");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("passes detailed failure mode", () => {
    const route = baseRoute({
      failureMode:
        "If the photography is merely pretty rather than precise, the route collapses into a generic lookbook because the strategic specificity depends entirely on visual execution quality.",
    });
    const issues = validateRouteQuality([route]);
    const fmErrors = issues.filter((i) => i.field === "failureMode" && i.severity === "error");
    expect(fmErrors).toHaveLength(0);
  });
});

describe("hasBlockingRouteQualityIssues", () => {
  it("returns true when any error-severity issue exists", () => {
    const route = baseRoute({ name: "Effortless Elegance" });
    const issues = validateRouteQuality([route]);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(true);
  });

  it("returns false when only warnings exist", () => {
    const warningOnlyIssues = [
      { field: "failureMode" as const, severity: "warning" as const, message: "Too vague" },
    ];
    expect(hasBlockingRouteQualityIssues(warningOnlyIssues)).toBe(false);
  });

  it("returns false for valid mock routes", () => {
    const issues = validateRouteQuality(MOCK_ROUTES);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(false);
  });
});
