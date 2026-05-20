import { describe, expect, it } from "vitest";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { buildMockCampaignRun } from "@/lib/workflow/mock-campaign-run";

describe("scoreRoutes", () => {
  it("returns a bounded strategic estimate for every route", () => {
    const run = buildMockCampaignRun();
    const scores = scoreRoutes(run.routes, run.simulations);

    expect(scores).toHaveLength(3);
    for (const score of scores) {
      expect(score.weightedTotal).toBeGreaterThanOrEqual(1);
      expect(score.weightedTotal).toBeLessThanOrEqual(5);
      expect(score.rationale).toContain("Strategic estimate");
    }
  });
});
