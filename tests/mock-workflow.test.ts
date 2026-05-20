import { describe, expect, it } from "vitest";
import { runCampaignWorkflow } from "@/lib/workflow/run-campaign-workflow";
import { NODO_SAMPLE_BRIEF } from "@/lib/workflow/mock-campaign-run";

describe("mock campaign workflow", () => {
  it("returns all required sections", async () => {
    const run = await runCampaignWorkflow(NODO_SAMPLE_BRIEF);

    expect(run.normalizedBrief).toBeDefined();
    expect(run.strategicTension).toBeDefined();
    expect(run.routes).toHaveLength(3);
    expect(run.personas.length).toBeGreaterThan(0);
    expect(run.simulations.length).toBeGreaterThan(0);
    expect(run.scores).toHaveLength(3);
    expect(run.premortem).toBeDefined();
    expect(run.comparisonMatrix.rows).toHaveLength(3);
    expect(run.humanSelection?.selectedRouteId).toBeTruthy();
    expect(run.executionPlan?.metrics.length).toBeGreaterThan(0);
    expect(run.traceEvents.length).toBeGreaterThan(0);
  });
});
