// Tests for budget handling in schema and display logic.

import { describe, expect, it } from "vitest";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";

// The minimal valid normalized brief (without budget) for testing
function makeMinimalBrief(overrides: Record<string, unknown> = {}) {
  return {
    brandName: "Test Brand",
    brandDescription: "A test brand for unit tests.",
    category: "Test campaign",
    campaignNameOptions: ["Test Campaign"],
    capsuleDescription: "A campaign for testing.",
    products: ["product a"],
    priceRange: { min: 50, max: 200, currency: "USD" },
    objectives: ["Increase awareness"],
    audience: {
      ageRange: "25-35",
      segments: ["professionals"],
      geographies: ["USA"],
      sensitivities: ["spam"],
    },
    timeline: {
      launchWindow: "Q4",
      teaserWindow: "Two weeks before",
      followUpWindow: "Two weeks after",
      risks: [],
    },
    channels: ["Instagram"],
    tone: ["warm"],
    constraints: [],
    openQuestions: ["Budget?"],
    ...overrides,
  };
}

describe("NormalizedCampaignBrief budget schema", () => {
  it("accepts a brief with no budget field", () => {
    const result = normalizedCampaignBriefSchema.safeParse(makeMinimalBrief());
    expect(result.success).toBe(true);
  });

  it("accepts a brief with budget label 'Not specified'", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: { label: "Not specified" } }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a brief with null min/max and unknown currency", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: { min: null, max: null } }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a brief with a valid known budget", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        budget: {
          min: 3000,
          max: 7000,
          currency: "EUR",
          label: "EUR 3,000–7,000",
          notes: "Excluding product costs.",
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a budget with negative min", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: { min: -100, max: 500, currency: "USD" } }),
    );
    expect(result.success).toBe(false);
  });

  it("parsed budget is undefined when omitted", () => {
    const result = normalizedCampaignBriefSchema.safeParse(makeMinimalBrief());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budget).toBeUndefined();
    }
  });
});

describe("Budget display logic", () => {
  it("undefined budget should display as 'Not specified' (display contract)", () => {
    // This documents the expected behavior for the UI formatBudget helper.
    // The actual function lives in components/brief/normalized-brief-panel.tsx.
    // We verify the schema allows undefined to flow through.
    const result = normalizedCampaignBriefSchema.safeParse(makeMinimalBrief());
    expect(result.success).toBe(true);
    if (result.success) {
      const b = result.data.budget;
      // If undefined: should display "Not specified"
      expect(b).toBeUndefined();
    }
  });

  it("budget with only label 'Not specified' should not produce 'USD 0-0'", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: { label: "Not specified" } }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      const b = result.data.budget;
      // min and max should be absent (not 0)
      expect(b?.min).toBeUndefined();
      expect(b?.max).toBeUndefined();
    }
  });
});
