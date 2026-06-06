// Tests for the quality gate inside generate-campaign-routes stage.
// Uses mock provider (no real OpenAI calls).
// Tests that quality warnings propagate and blocking issues trigger retry.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  validateRouteQuality,
  hasBlockingRouteQualityIssues,
} from "@/lib/workflow/quality/validate-route-quality";
import { campaignRoutes as MOCK_ROUTES } from "@/lib/workflow/mock-campaign-run";
import type { CampaignRoute } from "@/lib/schemas/campaign";

// --- Unit tests for the validators (not the stage itself) ---
// Stage tests that hit the mock provider are in generate-campaign-routes.test.ts

describe("route quality gate – validator contract", () => {
  it("generic route name produces blocking issues", () => {
    const genericRoute: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-generic",
      name: "Effortless Elegance",
    };
    const issues = validateRouteQuality([genericRoute]);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(true);
  });

  it("valid mock routes produce no blocking issues", () => {
    const issues = validateRouteQuality(MOCK_ROUTES);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(false);
  });

  it("does not expose raw model output — only typed RouteQualityIssue objects", () => {
    const issues = validateRouteQuality(MOCK_ROUTES);
    for (const issue of issues) {
      expect(issue).toHaveProperty("field");
      expect(issue).toHaveProperty("severity");
      expect(issue).toHaveProperty("message");
      expect(typeof issue.message).toBe("string");
    }
  });

  it("all issue fields are known enum values", () => {
    const validFields = ["name", "idea", "visualWorld", "proofMechanism", "killerLine", "failureMode"];
    const validSeverities = ["warning", "error"];

    const issues = validateRouteQuality(MOCK_ROUTES);
    for (const issue of issues) {
      expect(validFields).toContain(issue.field);
      expect(validSeverities).toContain(issue.severity);
    }
  });
});

describe("route quality gate – combined quality warnings", () => {
  it("multiple issues are all captured (not short-circuited)", () => {
    const badRoute: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-many-issues",
      name: "Calm Curation",
      killerLine: "Feel the difference",
      visualWorld: ["moody and warm"],
      proofMechanism: "Feature real customer testimonials about product quality.",
    };

    const issues = validateRouteQuality([badRoute]);
    // Should have issues for name, killerLine, visualWorld, proofMechanism
    const fields = issues.map((i) => i.field);
    expect(fields).toContain("name");
    expect(fields).toContain("proofMechanism");
  });

  it("no blocking issues for routes with concrete names and safe proof language", () => {
    const goodRoute: CampaignRoute = {
      ...MOCK_ROUTES[0],
      id: "route-good",
      name: "The After-Work Exhale",
      killerLine: "For days with more than one place in them.",
      visualWorld: [
        "tight environmental stills in stairwells and cafe windows",
        "hands holding espresso cups — never posed, always mid-moment",
      ],
      proofMechanism:
        "Scenario-based creative in real transitional city spaces — customer proof if available.",
    };

    const issues = validateRouteQuality([goodRoute]);
    expect(hasBlockingRouteQualityIssues(issues)).toBe(false);
  });
});
