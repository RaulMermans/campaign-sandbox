// Tests for budget handling in schema and display logic.

import { describe, expect, it } from "vitest";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { formatBudget } from "@/components/brief/normalized-brief-panel";

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
  it("undefined budget displays as 'Not specified'", () => {
    const result = normalizedCampaignBriefSchema.safeParse(makeMinimalBrief());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(formatBudget(result.data.budget)).toBe("Not specified");
    }
  });

  it("budget with only label 'Not specified' does not produce 'USD 0-0'", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: { label: "Not specified" } }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(formatBudget(result.data.budget)).toBe("Not specified");
      expect(formatBudget(result.data.budget)).not.toBe("USD 0-0");
    }
  });

  it("known budget range renders correctly", () => {
    expect(formatBudget({ min: 3000, max: 7000, currency: "EUR" })).toBe("EUR 3,000–7,000");
  });

  it("vague budget label is preserved", () => {
    expect(formatBudget({ label: "Lean test budget" })).toBe("Lean test budget");
  });

  it("bad zero range label is treated as unknown", () => {
    expect(formatBudget({ label: "USD 0-0" })).toBe("Not specified");
  });
});
