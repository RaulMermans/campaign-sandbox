// Tests for the generateExecutionPlanStage function.
// Runs in mock mode (no real API calls).
// Tests: mock output, schema validation, selectedRouteId preservation,
// invalid route ID error, trace event fields, runId propagation,
// and OpenAI error handling via mocked fetch.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateExecutionPlanStage } from "@/lib/workflow/stages/generate-execution-plan";
import { campaignExecutionPlanOutputSchema } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import { LlmJsonParseError, LlmSchemaValidationError, LlmProviderError } from "@/lib/llm/errors";
import {
  normalizedBrief as MOCK_BRIEF,
  strategicTension as MOCK_TENSION,
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
  premortemReview as MOCK_PREMORTEM,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { compareRoutes } from "@/lib/scoring/compare-routes";

const MOCK_SCORES = scoreRoutes(MOCK_ROUTES, MOCK_SIMULATIONS);
const MOCK_COMPARISON = compareRoutes({
  routes: MOCK_ROUTES,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
});

const VALID_INPUT = {
  normalizedBrief: MOCK_BRIEF,
  strategicTension: MOCK_TENSION,
  routes: MOCK_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
  premortemReview: MOCK_PREMORTEM,
  comparison: MOCK_COMPARISON,
  selectedRouteId: MOCK_ROUTES[0].id,
};

describe("generateExecutionPlanStage — mock mode", () => {
  it("returns a valid execution plan in mock mode", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    expect(result.executionPlan).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against campaignExecutionPlanOutputSchema", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    expect(() =>
      campaignExecutionPlanOutputSchema.parse({ executionPlan: result.executionPlan }),
    ).not.toThrow();
  });

  it("preserves selectedRouteId in the execution plan", async () => {
    const selectedRouteId = MOCK_ROUTES[0].id;
    const result = await generateExecutionPlanStage({ ...VALID_INPUT, selectedRouteId });
    expect(result.executionPlan.selectedRouteId).toBe(selectedRouteId);
  });

  it("works with each valid route ID", async () => {
    for (const route of MOCK_ROUTES) {
      const result = await generateExecutionPlanStage({ ...VALID_INPUT, selectedRouteId: route.id });
      expect(result.executionPlan.selectedRouteId).toBe(route.id);
    }
  });

  it("throws WorkflowValidationError for unknown selectedRouteId", async () => {
    await expect(
      generateExecutionPlanStage({ ...VALID_INPUT, selectedRouteId: "route-does-not-exist" }),
    ).rejects.toThrow(WorkflowValidationError);
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    const { traceEvent } = result;
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-execution-planner");
    expect(traceEvent.promptVersion).toBe("generate_execution_plan.v1");
  });

  it("trace event has costUsd of 0 in mock mode", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    expect(result.traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is generate_execution_plan", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    expect(result.traceEvent.stageId).toBe("generate_execution_plan");
  });

  it("preserves custom runId in trace event", async () => {
    const result = await generateExecutionPlanStage({ ...VALID_INPUT, runId: "test-run-999" });
    expect(result.traceEvent.runId).toBe("test-run-999");
  });

  it("execution plan has required top-level fields", async () => {
    const result = await generateExecutionPlanStage(VALID_INPUT);
    const { executionPlan } = result;
    expect(executionPlan.planTitle).toBeTruthy();
    expect(executionPlan.strategicSummary).toBeTruthy();
    expect(executionPlan.assumptions.length).toBeGreaterThan(0);
    expect(executionPlan.launchPhases.length).toBeGreaterThan(0);
    expect(executionPlan.channelPlan.length).toBeGreaterThan(0);
    expect(executionPlan.assetList.length).toBeGreaterThan(0);
    expect(executionPlan.copyExamples.length).toBeGreaterThan(0);
    expect(executionPlan.measurementPlan.length).toBeGreaterThan(0);
    expect(executionPlan.risksAndMitigations.length).toBeGreaterThan(0);
    expect(executionPlan.nextActions.length).toBeGreaterThan(0);
  });
});

describe("generateExecutionPlanStage — OpenAI error handling", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-fake-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
  });

  it("throws LlmProviderError when OpenAI API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      generateExecutionPlanStage(VALID_INPUT),
    ).rejects.toThrow(LlmProviderError);
  });

  it("throws LlmJsonParseError on non-JSON OpenAI response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json at all" } }],
      }),
    } as unknown as Response);

    await expect(
      generateExecutionPlanStage(VALID_INPUT),
    ).rejects.toThrow(LlmJsonParseError);
  });

  it("throws LlmSchemaValidationError on schema-invalid JSON from OpenAI", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ executionPlan: { invalid: true } }) } }],
      }),
    } as unknown as Response);

    await expect(
      generateExecutionPlanStage(VALID_INPUT),
    ).rejects.toThrow(LlmSchemaValidationError);
  });

  it("throws LlmProviderError on OpenAI API error response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as unknown as Response);

    await expect(
      generateExecutionPlanStage(VALID_INPUT),
    ).rejects.toThrow(LlmProviderError);
  });
});
