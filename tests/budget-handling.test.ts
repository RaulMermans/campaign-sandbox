// Tests for budget handling in schema and display logic.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { formatBudget, formatRange } from "@/components/brief/normalized-brief-panel";

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

describe("Normalize prompt budget and price guidance", () => {
  it("does not include forbidden unknown price or budget placeholder examples", () => {
    const prompt = readFileSync(`${process.cwd()}/prompts/normalize_brief.md`, "utf8");

    expect(prompt).not.toContain('"min": 0');
    expect(prompt).not.toContain('"max": 0');
    expect(prompt).not.toContain("USD 0-0");
    expect(prompt).not.toContain("EUR 0-0");
    expect(prompt).not.toContain("0-0");
  });
});

describe("NormalizedCampaignBrief priceRange schema", () => {
  it("accepts the canonical unknown price range object", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        priceRange: {
          min: null,
          max: null,
          label: "Not specified",
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a known price range with currency and label", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        priceRange: {
          min: 80,
          max: 220,
          currency: "EUR",
          label: "EUR 80–220",
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects price range 0-0 as an unknown placeholder", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        priceRange: {
          min: 0,
          max: 0,
          currency: "USD",
          label: "USD 0-0",
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["priceRange", "min"],
            message: expect.stringContaining("0-0"),
          }),
          expect.objectContaining({
            path: ["priceRange", "max"],
            message: expect.stringContaining("0-0"),
          }),
        ]),
      );
    }
  });
});

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

  it("accepts the canonical unknown budget object", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        budget: {
          label: "Not specified",
          min: null,
          max: null,
        },
      }),
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

  it("rejects budget as a string with a schema issue path", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: "Not specified" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["budget"],
            message: expect.any(String),
          }),
        ]),
      );
    }
  });

  it("rejects budget as null", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({ budget: null }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects budget 0-0 as an unknown placeholder", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        budget: {
          min: 0,
          max: 0,
          currency: "USD",
          label: "USD 0-0",
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["budget", "min"],
            message: expect.stringContaining("0-0"),
          }),
          expect.objectContaining({
            path: ["budget", "max"],
            message: expect.stringContaining("0-0"),
          }),
        ]),
      );
    }
  });

  it("normalizes a Luma Pantry style brief without USD 0-0 budget", () => {
    const result = normalizedCampaignBriefSchema.safeParse(
      makeMinimalBrief({
        brandName: "Luma Pantry",
        brandDescription: "A neighborhood pantry brand for low-waste kitchen staples.",
        category: "Food retail launch campaign",
        campaignNameOptions: ["Pantry Reset"],
        capsuleDescription: "A launch campaign for refillable staples and seasonal pantry boxes.",
        products: ["refill staples", "seasonal pantry boxes"],
        priceRange: { min: 12, max: 48, currency: "USD" },
        objectives: ["Drive store visits", "Grow email signups"],
        audience: {
          ageRange: "25-44",
          segments: ["home cooks", "low-waste shoppers"],
          geographies: ["Portland"],
          sensitivities: ["greenwashing", "premium grocery cliches"],
        },
        budget: {
          label: "Not specified",
          min: null,
          max: null,
        },
        timeline: {
          launchWindow: "Spring",
          teaserWindow: "Two weeks before launch",
          followUpWindow: "One month after launch",
          risks: [],
        },
        channels: ["Instagram", "email", "in-store signage"],
        tone: ["practical", "warm"],
        constraints: ["Avoid sustainability guilt"],
        openQuestions: ["Budget is not specified."],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(formatBudget(result.data.budget)).toBe("Not specified");
      expect(formatBudget(result.data.budget)).not.toBe("USD 0-0");
    }
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

describe("Range display logic", () => {
  it("never renders 0-0 placeholders", () => {
    expect(formatRange({ min: 0, max: 0, currency: "USD" })).toBe("Not specified");
    expect(formatRange({ label: "USD 0-0" })).toBe("Not specified");
    expect(formatRange({ label: "EUR 0-0" })).toBe("Not specified");
    expect(formatRange({ label: "0-0" })).toBe("Not specified");
  });

  it("renders unknown and known price ranges", () => {
    expect(formatRange({ min: null, max: null, label: "Not specified" })).toBe("Not specified");
    expect(formatRange({ min: 80, max: 220, currency: "EUR" })).toBe("EUR 80–220");
  });
});
