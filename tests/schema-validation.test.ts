import { describe, expect, it } from "vitest";
import { campaignRunSchema } from "@/lib/schemas/workflow";
import { buildMockCampaignRun, buildMockCompletedCampaignRun } from "@/lib/workflow/mock-campaign-run";

describe("campaign schemas", () => {
  it("validates the mock campaign run", () => {
    const run = buildMockCampaignRun();
    const parsed = campaignRunSchema.parse(run);

    expect(parsed.routes).toHaveLength(3);
    expect(parsed.normalizedBrief.brandName).toBe("NODO");
    expect(parsed.status).toBe("awaiting_selection");
    expect(parsed.executionPlan).toBeUndefined();
  });

  it("validates the completed mock campaign run", () => {
    const run = buildMockCompletedCampaignRun();
    const parsed = campaignRunSchema.parse(run);

    expect(parsed.status).toBe("completed");
    expect(parsed.humanSelection?.selectedRouteId).toBeTruthy();
    expect(parsed.executionPlan?.assumptions.length).toBeGreaterThan(0);
  });

  it("rejects malformed campaign runs", () => {
    const run = buildMockCampaignRun();

    expect(() => campaignRunSchema.parse({ ...run, routes: [] })).toThrow();
  });
});
