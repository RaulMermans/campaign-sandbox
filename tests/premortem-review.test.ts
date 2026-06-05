// Tests for premortemReviewStage and validatePremortemCoverage.
// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".
// OpenAI paths use mocked fetch — no real API calls are made.

import { afterEach, describe, expect, it, vi } from "vitest";
import { premortemReviewStage } from "@/lib/workflow/stages/premortem-review";
import { validatePremortemCoverage } from "@/lib/workflow/validate-premortem";
import {
  premortemReviewOutputSchema,
} from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";
import {
  LlmJsonParseError,
  LlmProviderError,
  LlmSchemaValidationError,
} from "@/lib/llm/errors";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";
import {
  normalizedBrief as MOCK_NORMALIZED_BRIEF,
  strategicTension as MOCK_STRATEGIC_TENSION,
  campaignRoutes as MOCK_CAMPAIGN_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";
import { scoreRoutes } from "@/lib/scoring/score-routes";

const MOCK_SCORES = scoreRoutes(MOCK_CAMPAIGN_ROUTES, MOCK_SIMULATIONS);

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
  personas: MOCK_PERSONAS,
  simulations: MOCK_SIMULATIONS,
  scores: MOCK_SCORES,
};

// ---------------------------------------------------------------------------
// Mock mode — output shape
// ---------------------------------------------------------------------------

describe("premortemReviewStage – mock mode output shape", () => {
  it("returns a result with review and traceEvent", async () => {
    const result = await premortemReviewStage(SAMPLE_INPUT);
    expect(result.review).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against premortemReviewOutputSchema", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    expect(() => premortemReviewOutputSchema.parse({ review })).not.toThrow();
  });

  it("review has exactly one routeRisk per route", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    expect(review.routeRisks).toHaveLength(MOCK_CAMPAIGN_ROUTES.length);
    const ids = new Set(review.routeRisks.map((rr) => rr.routeId));
    expect(ids.size).toBe(MOCK_CAMPAIGN_ROUTES.length);
  });

  it("routeRisk IDs match input route IDs", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    const inputIds = new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id));
    for (const rr of review.routeRisks) {
      expect(inputIds.has(rr.routeId)).toBe(true);
    }
  });

  it("no duplicate routeRisk IDs", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    const ids = review.routeRisks.map((rr) => rr.routeId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each routeRisk has at least one risk and one mitigation", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    for (const rr of review.routeRisks) {
      expect(rr.risks.length).toBeGreaterThanOrEqual(1);
      expect(rr.mitigations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("overallRisks is non-empty", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    expect(review.overallRisks.length).toBeGreaterThan(0);
  });

  it("decisionWarnings is non-empty", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    expect(review.decisionWarnings.length).toBeGreaterThan(0);
  });

  it("summary is non-empty", async () => {
    const { review } = await premortemReviewStage(SAMPLE_INPUT);
    expect(review.summary.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Mock mode — trace event
// ---------------------------------------------------------------------------

describe("premortemReviewStage – mock mode trace event", () => {
  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await premortemReviewStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const { traceEvent } = await premortemReviewStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-premortem-reviewer");
    expect(traceEvent.promptVersion).toBe("premortem_review.v1");
  });

  it("trace event has costUsd: 0 in mock mode", async () => {
    const { traceEvent } = await premortemReviewStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is premortem_review and status is completed", async () => {
    const { traceEvent } = await premortemReviewStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("premortem_review");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId and preserves it in the trace event", async () => {
    const { traceEvent } = await premortemReviewStage({
      ...SAMPLE_INPUT,
      runId: "run-premortem-test-999",
    });
    expect(traceEvent.runId).toBe("run-premortem-test-999");
  });
});

// ---------------------------------------------------------------------------
// Mock mode — custom routes (non-fixture IDs)
// ---------------------------------------------------------------------------

describe("premortemReviewStage – mock mode with custom routes", () => {
  it("generates deterministic placeholder risks for routes outside the NODO fixture", async () => {
    const customRoutes = [
      { ...MOCK_CAMPAIGN_ROUTES[0], id: "route-custom-x" },
    ];
    const { review } = await premortemReviewStage({
      ...SAMPLE_INPUT,
      routes: customRoutes,
    });
    expect(review.routeRisks).toHaveLength(1);
    expect(review.routeRisks[0].routeId).toBe("route-custom-x");
    expect(review.routeRisks[0].risks.length).toBeGreaterThanOrEqual(1);
    expect(review.routeRisks[0].mitigations.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// validatePremortemCoverage helper
// ---------------------------------------------------------------------------

describe("validatePremortemCoverage", () => {
  const baseRoutes = MOCK_CAMPAIGN_ROUTES.slice(0, 2);

  function makeReview(routeIds: string[]) {
    return {
      summary: "Test summary.",
      routeRisks: routeIds.map((routeId) => ({
        routeId,
        risks: ["risk one"],
        mitigations: ["mitigation one"],
      })),
      overallRisks: ["overall risk"],
      decisionWarnings: ["decision warning"],
      topFailureRisks: [
        {
          risk: "Generic visual execution.",
          whyItHappens: "Budget pressure.",
          earlyWarningSign: "Shot list defaults to clean-background tiles.",
          mitigation: "Lock visual brief before production.",
          affectedTeam: "Creative",
        },
      ],
    };
  }

  it("passes when every route has exactly one risk review", () => {
    const review = makeReview(baseRoutes.map((r) => r.id));
    expect(() => validatePremortemCoverage({ review, routes: baseRoutes })).not.toThrow();
  });

  it("throws WorkflowValidationError when a route has no risk review", () => {
    const review = makeReview([baseRoutes[0].id]); // missing baseRoutes[1]
    expect(() =>
      validatePremortemCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when a routeRisk references an unknown routeId", () => {
    const review = makeReview([baseRoutes[0].id, baseRoutes[1].id, "route-does-not-exist"]);
    expect(() =>
      validatePremortemCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when a routeId is duplicated", () => {
    const review = makeReview([baseRoutes[0].id, baseRoutes[0].id, baseRoutes[1].id]);
    expect(() =>
      validatePremortemCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("error message mentions the missing route", () => {
    const review = makeReview([baseRoutes[0].id]);
    let caught: WorkflowValidationError | null = null;
    try {
      validatePremortemCoverage({ review, routes: baseRoutes });
    } catch (err) {
      caught = err as WorkflowValidationError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.issues.some((i) => i.message.includes(baseRoutes[1].id))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — invalid model output produces typed errors
// ---------------------------------------------------------------------------

describe("premortemReviewStage – OpenAI mode with bad response", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws LlmSchemaValidationError when model output does not match schema", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  review: { not_a_valid_field: true },
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      premortemReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmSchemaValidationError);
  });

  it("throws WorkflowValidationError when model returns missing route coverage", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    // Return review with only one routeRisk when three routes are expected.
    const partialReview = {
      review: {
        summary: "A summary.",
        routeRisks: [
          {
            routeId: MOCK_CAMPAIGN_ROUTES[0].id,
            risks: ["risk one"],
            mitigations: ["mitigation one"],
          },
          // missing the other two routes
        ],
        overallRisks: ["overall risk"],
        decisionWarnings: ["warning one"],
        topFailureRisks: [
          {
            risk: "A top risk.",
            whyItHappens: "Because of production pressure.",
            earlyWarningSign: "Shot list changes late.",
            mitigation: "Lock visual brief early.",
            affectedTeam: "Creative",
          },
        ],
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(partialReview),
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
        text: async () => "{}",
      }),
    );

    // WorkflowValidationError is thrown after schema passes but coverage check fails.
    // Both retries fail, so the WorkflowValidationError propagates.
    await expect(
      premortemReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it("throws LlmJsonParseError when model returns non-JSON content", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  "Here is the pre-mortem review I have generated for your campaign routes...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      premortemReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    // No OPENAI_API_KEY set.

    await expect(
      premortemReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});
