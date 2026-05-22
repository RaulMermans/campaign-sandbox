import { describe, expect, it } from "vitest";
import { traceEventSchema } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { buildMockCampaignRun, buildMockCompletedCampaignRun } from "@/lib/workflow/mock-campaign-run";

const workflowNodeIds = [
  "normalize_brief",
  "extract_strategic_tension",
  "generate_routes",
  "build_personas",
  "simulate_reactions",
  "score_routes",
  "premortem_review",
  "compare_routes",
  "human_selection",
  "generate_execution_plan",
  "export_artifact",
];

describe("createTraceEvent", () => {
  it("creates a valid trace event with defaults", () => {
    const event = createTraceEvent({
      runId: "run-1",
      stageId: "normalize_brief",
      type: "stage.completed",
      status: "completed",
      message: "Brief normalized.",
    });

    expect(traceEventSchema.parse(event).id).toContain("normalize_brief");
    expect(event.metadata).toEqual({});
  });

  it("accepts optional future LLM telemetry fields", () => {
    const event = createTraceEvent({
      runId: "run-1",
      stageId: "normalize_brief",
      type: "stage.completed",
      status: "completed",
      message: "Brief normalized.",
      provider: "mock",
      model: "mock-model",
      promptVersion: "normalize_brief.v1",
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0,
      evalIds: ["campaign_sandbox_trace_contract"],
    });

    expect(traceEventSchema.parse(event).promptVersion).toBe("normalize_brief.v1");
  });

  it("emits a trace event for every workflow node before human selection", () => {
    const run = buildMockCampaignRun();
    const stages = new Set(run.traceEvents.map((event) => event.stageId));

    for (const nodeId of workflowNodeIds) {
      expect(stages.has(nodeId)).toBe(true);
    }

    expect(run.traceEvents.find((event) => event.stageId === "human_selection")?.status).toBe("pending");
    expect(run.traceEvents.some((event) => event.type === "workflow.completed")).toBe(false);
  });

  it("marks final workflow nodes completed after human selection", () => {
    const run = buildMockCompletedCampaignRun();

    for (const nodeId of workflowNodeIds) {
      expect(run.traceEvents.find((event) => event.stageId === nodeId)?.status).toBe("completed");
    }

    expect(run.traceEvents.some((event) => event.type === "workflow.completed")).toBe(true);
  });
});
