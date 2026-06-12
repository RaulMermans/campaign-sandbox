// Tests for creativeDirectorReviewStage and validateCreativeDirectorReviewCoverage.
// Runs without any env vars set — CAMPAIGN_SANDBOX_LLM_PROVIDER defaults to "mock".
// OpenAI paths use mocked fetch — no real API calls are made.

import { afterEach, describe, expect, it, vi } from "vitest";
import { creativeDirectorReviewStage } from "@/lib/workflow/stages/creative-director-review";
import { validateCreativeDirectorReviewCoverage } from "@/lib/workflow/validate-creative-director-review";
import { creativeDirectorReviewOutputSchema } from "@/lib/schemas/campaign";
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
} from "@/lib/workflow/mock-campaign-run";

const SAMPLE_INPUT = {
  normalizedBrief: MOCK_NORMALIZED_BRIEF,
  strategicTension: MOCK_STRATEGIC_TENSION,
  routes: MOCK_CAMPAIGN_ROUTES,
};

// ---------------------------------------------------------------------------
// Mock mode — output shape
// ---------------------------------------------------------------------------

describe("creativeDirectorReviewStage – mock mode output shape", () => {
  it("returns a result with review and traceEvent", async () => {
    const result = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(result.review).toBeDefined();
    expect(result.traceEvent).toBeDefined();
  });

  it("output validates against creativeDirectorReviewOutputSchema", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(() => creativeDirectorReviewOutputSchema.parse({ review })).not.toThrow();
  });

  it("review has exactly one routeReview per route", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(review.routeReviews).toHaveLength(MOCK_CAMPAIGN_ROUTES.length);
    const ids = new Set(review.routeReviews.map((rr) => rr.routeId));
    expect(ids.size).toBe(MOCK_CAMPAIGN_ROUTES.length);
  });

  it("routeReview IDs match input route IDs", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    const inputIds = new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id));
    for (const rr of review.routeReviews) {
      expect(inputIds.has(rr.routeId)).toBe(true);
    }
  });

  it("no duplicate routeReview IDs", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    const ids = review.routeReviews.map((rr) => rr.routeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("strongestRouteId references a known route", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    const ids = new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id));
    expect(ids.has(review.strongestRouteId)).toBe(true);
  });

  it("each routeReview has scores between 1 and 5", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    for (const rr of review.routeReviews) {
      for (const score of [
        rr.originalityScore,
        rr.ownabilityScore,
        rr.culturalSharpnessScore,
        rr.visualPotentialScore,
        rr.conversionClarityScore,
      ]) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      }
    }
  });

  it("each routeReview has 3 to 6 sharper name and killer line options", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    for (const rr of review.routeReviews) {
      expect(rr.sharperNameOptions.length).toBeGreaterThanOrEqual(3);
      expect(rr.sharperNameOptions.length).toBeLessThanOrEqual(6);
      expect(rr.sharperKillerLines.length).toBeGreaterThanOrEqual(3);
      expect(rr.sharperKillerLines.length).toBeLessThanOrEqual(6);
    }
  });

  it("each routeReview has at least one creative director note", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    for (const rr of review.routeReviews) {
      expect(rr.creativeDirectorNotes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("crossRouteRecommendations is non-empty", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(review.crossRouteRecommendations.length).toBeGreaterThan(0);
  });

  it("caveat states this is expert critique, not market research", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(review.caveat.toLowerCase()).toContain("not");
    expect(review.caveat.toLowerCase()).toContain("research");
  });

  it("routesToAvoidOrMerge entries reference known route IDs", async () => {
    const { review } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    const ids = new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id));
    for (const entry of review.routesToAvoidOrMerge) {
      expect(ids.has(entry.routeId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Mock mode — trace event
// ---------------------------------------------------------------------------

describe("creativeDirectorReviewStage – mock mode trace event", () => {
  it("trace event validates against traceEventSchema", async () => {
    const { traceEvent } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(() => traceEventSchema.parse(traceEvent)).not.toThrow();
  });

  it("trace event includes provider, model, and promptVersion", async () => {
    const { traceEvent } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(traceEvent.provider).toBe("mock");
    expect(traceEvent.model).toBe("mock-creative-director");
    expect(traceEvent.promptVersion).toBe("creative_director_review.v1");
  });

  it("trace event has costUsd: 0 in mock mode", async () => {
    const { traceEvent } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(traceEvent.costUsd).toBe(0);
  });

  it("trace event stageId is creative_director_review and status is completed", async () => {
    const { traceEvent } = await creativeDirectorReviewStage(SAMPLE_INPUT);
    expect(traceEvent.stageId).toBe("creative_director_review");
    expect(traceEvent.status).toBe("completed");
    expect(traceEvent.type).toBe("stage.completed");
  });

  it("accepts a custom runId and preserves it in the trace event", async () => {
    const { traceEvent } = await creativeDirectorReviewStage({
      ...SAMPLE_INPUT,
      runId: "run-creative-review-test-999",
    });
    expect(traceEvent.runId).toBe("run-creative-review-test-999");
  });
});

// ---------------------------------------------------------------------------
// Mock mode — custom routes (non-fixture IDs / fast-mode subsets)
// ---------------------------------------------------------------------------

describe("creativeDirectorReviewStage – mock mode with custom routes", () => {
  // The pipeline always produces exactly 3 routes (campaignRunSchema enforces
  // routes.length(3)), and the review schema requires routeReviews.min(3) to
  // match — so "custom routes" here means re-IDed/re-ordered fixture routes,
  // not a smaller subset.
  it("generates a review covering a re-IDed set of routes generically", async () => {
    const customRoutes = MOCK_CAMPAIGN_ROUTES.map((route, idx) => ({
      ...route,
      id: `route-custom-${idx}`,
    }));
    const { review } = await creativeDirectorReviewStage({
      ...SAMPLE_INPUT,
      routes: customRoutes,
    });
    expect(review.routeReviews).toHaveLength(3);
    const ids = new Set(review.routeReviews.map((rr) => rr.routeId));
    expect(ids).toEqual(new Set(customRoutes.map((r) => r.id)));
    expect(new Set(MOCK_CAMPAIGN_ROUTES.map((r) => r.id)).has(review.strongestRouteId)).toBe(false);
    expect(ids.has(review.strongestRouteId)).toBe(true);
  });

  it("output still validates against the schema and coverage rules for custom routes", async () => {
    const customRoutes = MOCK_CAMPAIGN_ROUTES.map((route, idx) => ({
      ...route,
      id: `route-solo-${idx}`,
    }));
    const { review } = await creativeDirectorReviewStage({
      ...SAMPLE_INPUT,
      routes: customRoutes,
    });
    expect(() => creativeDirectorReviewOutputSchema.parse({ review })).not.toThrow();
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: customRoutes }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateCreativeDirectorReviewCoverage helper
// ---------------------------------------------------------------------------

describe("validateCreativeDirectorReviewCoverage", () => {
  const baseRoutes = MOCK_CAMPAIGN_ROUTES.slice(0, 2);

  function makeReview(routeIds: string[], overrides?: Partial<{ strongestRouteId: string; routesToAvoidOrMerge: Array<{ routeId: string; reason: string }> }>) {
    return {
      overallVerdict: "Test verdict.",
      strongestRouteId: overrides?.strongestRouteId ?? routeIds[0],
      routeReviews: routeIds.map((routeId) => ({
        routeId,
        routeName: "Test Route",
        originalityScore: 3,
        ownabilityScore: 3,
        culturalSharpnessScore: 3,
        visualPotentialScore: 3,
        conversionClarityScore: 3,
        genericityRisk: "medium" as const,
        verdict: "sharpen" as const,
        why: "Because reasons.",
        whatFeelsGeneric: [],
        whatFeelsOwnable: [],
        sharperNameOptions: ["A", "B", "C"],
        sharperKillerLines: ["A", "B", "C"],
        creativeDirectorNotes: ["Note one."],
      })),
      crossRouteRecommendations: ["Recommendation one."],
      routesToAvoidOrMerge: overrides?.routesToAvoidOrMerge ?? [],
      finalRecommendation: "Final recommendation.",
      caveat: "This is expert creative critique, not market research or audience validation.",
    };
  }

  it("passes when every route has exactly one review and references are valid", () => {
    const review = makeReview(baseRoutes.map((r) => r.id));
    expect(() => validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes })).not.toThrow();
  });

  it("throws WorkflowValidationError when a route has no review", () => {
    const review = makeReview([baseRoutes[0].id]);
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when a routeReview references an unknown routeId", () => {
    const review = makeReview([baseRoutes[0].id, baseRoutes[1].id, "route-does-not-exist"]);
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when a routeId is duplicated", () => {
    const review = makeReview([baseRoutes[0].id, baseRoutes[0].id, baseRoutes[1].id]);
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when strongestRouteId references an unknown route", () => {
    const review = makeReview(baseRoutes.map((r) => r.id), { strongestRouteId: "route-unknown" });
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("throws WorkflowValidationError when routesToAvoidOrMerge references an unknown route", () => {
    const review = makeReview(baseRoutes.map((r) => r.id), {
      routesToAvoidOrMerge: [{ routeId: "route-unknown", reason: "Because." }],
    });
    expect(() =>
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes }),
    ).toThrow(WorkflowValidationError);
  });

  it("error message mentions the missing route", () => {
    const review = makeReview([baseRoutes[0].id]);
    let caught: WorkflowValidationError | null = null;
    try {
      validateCreativeDirectorReviewCoverage({ review, routes: baseRoutes });
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

describe("creativeDirectorReviewStage – OpenAI mode with bad response", () => {
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
                content: JSON.stringify({ review: { not_a_valid_field: true } }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      creativeDirectorReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmSchemaValidationError);
  });

  it("throws WorkflowValidationError when model returns route coverage that fails cross-reference checks", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    function makeRouteReview(routeId: string, routeName: string) {
      return {
        routeId,
        routeName,
        originalityScore: 4,
        ownabilityScore: 4,
        culturalSharpnessScore: 4,
        visualPotentialScore: 4,
        conversionClarityScore: 4,
        genericityRisk: "low",
        verdict: "keep",
        why: "Strong work.",
        whatFeelsGeneric: [],
        whatFeelsOwnable: ["A specific detail."],
        sharperNameOptions: ["A", "B", "C"],
        sharperKillerLines: ["A", "B", "C"],
        creativeDirectorNotes: ["Keep going."],
      };
    }

    // Schema-valid on its own (3 unique routeReviews, strongestRouteId matches
    // one of them, caveat is compliant — so the Zod superRefine passes) but
    // every routeId is foreign to the actual input routes, so the
    // cross-reference coverage validator must reject it.
    const partialReview = {
      review: {
        overallVerdict: "A verdict.",
        strongestRouteId: "route-foreign-a",
        routeReviews: [
          makeRouteReview("route-foreign-a", "Foreign Route A"),
          makeRouteReview("route-foreign-b", "Foreign Route B"),
          makeRouteReview("route-foreign-c", "Foreign Route C"),
        ],
        crossRouteRecommendations: ["Recommendation one."],
        routesToAvoidOrMerge: [],
        finalRecommendation: "Pursue route one.",
        caveat: "This is expert creative critique, not market research or audience validation.",
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

    await expect(
      creativeDirectorReviewStage(SAMPLE_INPUT),
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
                content: "Here is the creative review I have generated for your campaign routes...",
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 12 },
        }),
        text: async () => "{}",
      }),
    );

    await expect(
      creativeDirectorReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });

  it("throws LlmProviderError when the provider request fails", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: "Internal server error" } }),
        text: async () => "Internal server error",
      }),
    );

    await expect(
      creativeDirectorReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(LlmProviderError);
  });
});

// ---------------------------------------------------------------------------
// OpenAI mode — unsupported proof language triggers repair retry, then throws
// ---------------------------------------------------------------------------

describe("creativeDirectorReviewStage – OpenAI mode with unsupported proof language", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws WorkflowValidationError when the review persistently contains unsupported customer proof language", async () => {
    vi.stubEnv("CAMPAIGN_SANDBOX_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-for-unit-test");

    function makeRouteReview(routeId: string, routeName: string, idx: number) {
      return {
        routeId,
        routeName,
        originalityScore: 4,
        ownabilityScore: 4,
        culturalSharpnessScore: 4,
        visualPotentialScore: 4,
        conversionClarityScore: 4,
        genericityRisk: "low" as const,
        verdict: "keep" as const,
        why: "Strong, specific work.",
        whatFeelsGeneric: [],
        whatFeelsOwnable: ["A specific detail."],
        sharperNameOptions: ["A", "B", "C"],
        sharperKillerLines: ["A", "B", "C"],
        creativeDirectorNotes:
          idx === 0
            ? ["Feature real customer testimonials front and center."]
            : ["Keep going."],
      };
    }

    const reviewWithFakeProof = {
      review: {
        overallVerdict: "A verdict.",
        strongestRouteId: MOCK_CAMPAIGN_ROUTES[0].id,
        routeReviews: MOCK_CAMPAIGN_ROUTES.map((route, idx) =>
          makeRouteReview(route.id, route.name, idx),
        ),
        crossRouteRecommendations: ["Recommendation one."],
        routesToAvoidOrMerge: [],
        finalRecommendation: "Pursue route one.",
        caveat: "This is expert creative critique, not market research or audience validation.",
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
                content: JSON.stringify(reviewWithFakeProof),
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
        text: async () => "{}",
      }),
    );

    // The model persistently returns the same unsupported proof language, even
    // after the repair retry, so the stage throws after the retry is exhausted.
    await expect(
      creativeDirectorReviewStage(SAMPLE_INPUT),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });
});
