import { describe, expect, it } from "vitest";
import { runCampaignWorkflow } from "@/lib/workflow/run-campaign-workflow";
import { buildMockCompletedCampaignRun, NODO_SAMPLE_BRIEF } from "@/lib/workflow/mock-campaign-run";

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
    expect(run.status).toBe("awaiting_selection");
    expect(run.humanSelection).toBeUndefined();
    expect(run.executionPlan).toBeUndefined();
    expect(run.traceEvents.length).toBeGreaterThan(0);
  });

  it("generates a completed mock run only after explicit route selection", () => {
    const run = buildMockCompletedCampaignRun("route-uniform-for-motion", NODO_SAMPLE_BRIEF);

    expect(run.status).toBe("completed");
    expect(run.humanSelection?.selectedRouteId).toBe("route-uniform-for-motion");
    expect(run.executionPlan?.selectedRouteId).toBe("route-uniform-for-motion");
    expect(run.executionPlan?.measurementPlan.length).toBeGreaterThan(0);
  });
});
