import { z } from "zod";
import { traceEventSchema } from "@/lib/schemas/trace";

const boundedScoreSchema = z.number().min(1).max(5);
const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid datetime",
});

export const rawCampaignBriefSchema = z
  .object({
    text: z.string().min(20),
    source: z.enum(["paste", "fixture", "import"]).default("paste"),
    receivedAt: isoDateTimeSchema.optional(),
  })
  .strict();

export const normalizedCampaignBriefSchema = z
  .object({
    brandName: z.string().min(1),
    brandDescription: z.string().min(1),
    category: z.string().min(1),
    campaignNameOptions: z.array(z.string().min(1)).min(1),
    capsuleDescription: z.string().min(1),
    products: z.array(z.string().min(1)).min(1),
    priceRange: z
      .object({
        min: z.number().nonnegative().nullable().optional(),
        max: z.number().nonnegative().nullable().optional(),
        currency: z.string().nullable().optional(),
        label: z.string().optional(),
        notes: z.string().nullable().optional(),
      })
      .strict()
      .superRefine((priceRange, ctx) => {
        if (priceRange.min === 0 && priceRange.max === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["min"],
            message: "Price range must not use 0-0 as a placeholder for unknown price.",
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["max"],
            message: "Price range must not use 0-0 as a placeholder for unknown price.",
          });
        }
      }),
    objectives: z.array(z.string().min(1)).min(1),
    audience: z
      .object({
        ageRange: z.string().min(1),
        segments: z.array(z.string().min(1)).min(1),
        geographies: z.array(z.string().min(1)).min(1),
        sensitivities: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    budget: z
      .object({
        min: z.number().nonnegative().nullable().optional(),
        max: z.number().nonnegative().nullable().optional(),
        currency: z.string().nullable().optional(),
        label: z.string().optional(),
        notes: z.string().nullable().optional(),
      })
      .strict()
      .superRefine((budget, ctx) => {
        if (budget.min === 0 && budget.max === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["min"],
            message: "Budget must not use 0-0 as a placeholder for unknown budget.",
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["max"],
            message: "Budget must not use 0-0 as a placeholder for unknown budget.",
          });
        }
      })
      .optional(),
    timeline: z
      .object({
        launchWindow: z.string().min(1),
        teaserWindow: z.string().min(1),
        followUpWindow: z.string().min(1),
        risks: z.array(z.string()).default([]),
      })
      .strict(),
    channels: z.array(z.string().min(1)).min(1),
    tone: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string()).default([]),
    openQuestions: z.array(z.string()).default([]),
  })
  .strict();

export const strategicTensionSchema = z
  .object({
    coreTension: z.string().min(1),
    audienceInsight: z.string().min(1),
    culturalContext: z.string().min(1),
    brandContradiction: z.string().min(1),
    creativeOpportunity: z.string().min(1),
    avoid: z.array(z.string()).min(1),
    // Sharper structural fields for the tension statement
    audienceDesire: z.string().min(1),
    audienceResistance: z.string().min(1),
    brandProofChallenge: z.string().min(1),
    creativeTrap: z.string().min(1),
    tensionStatement: z.string().min(1),
  })
  .strict();

export const campaignRouteSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    strategicRole: z.enum(["safest", "boldest", "conversion"]),
    position: z.string().min(1),
    concept: z.string().min(1),
    whyItWorks: z.string().min(1),
    keyMessage: z.string().min(1),
    tone: z.array(z.string().min(1)).min(1),
    channels: z.array(z.string().min(1)).min(1),
    activationIdeas: z.array(z.string().min(1)).min(1),
    sampleCopy: z.array(z.string().min(1)).min(1),
    assetIdeas: z.array(z.string().min(1)).min(1),
    risks: z.array(z.string().min(1)).min(1),
    // Production DNA fields
    enemy: z.string().min(1),
    visualWorld: z.array(z.string().min(1)).min(1),
    proofMechanism: z.string().min(1),
    channelFit: z.array(z.string().min(1)).min(1),
    killerLine: z.string().min(1),
    failureMode: z.string().min(1),
  })
  .strict();

export const personaSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    segment: z.string().min(1),
    ageRange: z.string().min(1),
    location: z.string().min(1),
    mindset: z.string().min(1),
    motivations: z.array(z.string().min(1)).min(1),
    sensitivities: z.array(z.string().min(1)).min(1),
    likelyChannels: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const personaSimulationSchema = z
  .object({
    routeId: z.string().min(1),
    personaId: z.string().min(1),
    likelyReaction: z.string().min(1),
    positives: z.array(z.string().min(1)).min(1),
    objections: z.array(z.string().min(1)).min(1),
    quotedReaction: z.string().min(1),
    resonanceScore: boundedScoreSchema,
    conversionIntent: boundedScoreSchema,
    signupIntent: boundedScoreSchema,
    confidence: z.enum(["low", "medium", "high"]),
    caveat: z.string().min(1),
    // Decision-oriented fields
    understoodMessage: z.string().min(1),
    mainObjection: z.string().min(1),
    actionTrigger: z.string().min(1),
    bestCTA: z.string().min(1),
  })
  .strict();

export const routeScoreSchema = z
  .object({
    routeId: z.string().min(1),
    label: z.string().min(1),
    scores: z
      .object({
        clarity: boundedScoreSchema,
        distinctiveness: boundedScoreSchema,
        feasibility: boundedScoreSchema,
        conversionPotential: boundedScoreSchema,
        culturalRelevance: boundedScoreSchema,
        brandFit: boundedScoreSchema,
        riskAdjustedConfidence: boundedScoreSchema,
      })
      .strict(),
    weightedTotal: z.number().min(1).max(5),
    rationale: z.string().min(1),
  })
  .strict();

// Wrapper for route scores output.
// Scores are bounded qualitative strategic estimates (1–5), not probabilities or predictions.
// Enforces: at least one score and unique route IDs.
export const routeScoresOutputSchema = z
  .object({
    scores: z.array(routeScoreSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const routeIds = new Set(value.scores.map((score) => score.routeId));

    if (routeIds.size !== value.scores.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scores"],
        message: "Route scores must include unique route IDs.",
      });
    }
  });

export type RouteScoresOutput = z.infer<typeof routeScoresOutputSchema>;

export const premortemReviewSchema = z
  .object({
    summary: z.string().min(1),
    routeRisks: z
      .array(
        z
          .object({
            routeId: z.string().min(1),
            risks: z.array(z.string().min(1)).min(1),
            mitigations: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
    overallRisks: z.array(z.string().min(1)).min(1),
    decisionWarnings: z.array(z.string().min(1)).min(1),
    topFailureRisks: z
      .array(
        z
          .object({
            risk: z.string().min(1),
            whyItHappens: z.string().min(1),
            earlyWarningSign: z.string().min(1),
            mitigation: z.string().min(1),
            affectedTeam: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const premortemReviewOutputSchema = z
  .object({
    review: premortemReviewSchema,
  })
  .strict();

export type PremortemReviewOutput = z.infer<typeof premortemReviewOutputSchema>;

export const routeComparisonRowSchema = z
  .object({
    routeId: z.string().min(1),
    routeName: z.string().min(1),
    strategicRole: z.enum(["safest", "boldest", "conversion"]),
    weightedTotal: z.number().min(1).max(5),
    audienceResonance: z.number().min(1).max(5),
    conversionPotential: z.number().min(1).max(5),
    feasibility: z.number().min(1).max(5),
    riskLevel: z.enum(["low", "medium", "high"]),
    keyStrengths: z.array(z.string().min(1)).min(1),
    keyRisks: z.array(z.string().min(1)).min(1),
    recommendation: z.string().min(1),
  })
  .strict();

export const routeComparisonMatrixSchema = z
  .object({
    rows: z.array(routeComparisonRowSchema).min(1),
    recommendedRouteId: z.string().min(1),
    summary: z.string().min(1),
    decisionNotes: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const rowIds = new Set(value.rows.map((row) => row.routeId));

    if (rowIds.size !== value.rows.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rows"],
        message: "Comparison rows must include unique route IDs.",
      });
    }

    if (!rowIds.has(value.recommendedRouteId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recommendedRouteId"],
        message: "Recommended route must reference an existing comparison row.",
      });
    }
  });

// Creative Director Review — a bounded, schema-validated critique stage that
// sharpens route naming, ownability, and creative quality before human selection.
// This is expert creative critique, not market research or audience validation.
export const creativeDirectorRouteReviewSchema = z
  .object({
    routeId: z.string().min(1),
    routeName: z.string().min(1),
    originalityScore: boundedScoreSchema,
    ownabilityScore: boundedScoreSchema,
    culturalSharpnessScore: boundedScoreSchema,
    visualPotentialScore: boundedScoreSchema,
    conversionClarityScore: boundedScoreSchema,
    genericityRisk: z.enum(["low", "medium", "high"]),
    verdict: z.enum(["keep", "sharpen", "merge", "kill"]),
    why: z.string().min(1),
    whatFeelsGeneric: z.array(z.string().min(1)),
    whatFeelsOwnable: z.array(z.string().min(1)),
    sharperNameOptions: z.array(z.string().min(1)).min(3).max(6),
    sharperKillerLines: z.array(z.string().min(1)).min(3).max(6),
    creativeDirectorNotes: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const creativeDirectorReviewSchema = z
  .object({
    overallVerdict: z.string().min(1),
    strongestRouteId: z.string().min(1),
    routeReviews: z.array(creativeDirectorRouteReviewSchema).min(3),
    crossRouteRecommendations: z.array(z.string().min(1)).min(1),
    routesToAvoidOrMerge: z.array(
      z
        .object({
          routeId: z.string().min(1),
          reason: z.string().min(1),
        })
        .strict(),
    ),
    finalRecommendation: z.string().min(1),
    caveat: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.routeReviews.map((r) => r.routeId));
    if (ids.size !== value.routeReviews.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routeReviews"],
        message: "Creative director route reviews must include unique route IDs.",
      });
    }
    if (!ids.has(value.strongestRouteId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["strongestRouteId"],
        message: "strongestRouteId must reference a route covered in routeReviews.",
      });
    }
    if (!value.caveat.toLowerCase().includes("not") || !value.caveat.toLowerCase().includes("research")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["caveat"],
        message: "caveat must clarify this is expert creative critique, not market research.",
      });
    }
  });

export const creativeDirectorReviewOutputSchema = z
  .object({
    review: creativeDirectorReviewSchema,
  })
  .strict();

export type CreativeDirectorRouteReview = z.infer<typeof creativeDirectorRouteReviewSchema>;
export type CreativeDirectorReview = z.infer<typeof creativeDirectorReviewSchema>;
export type CreativeDirectorReviewOutput = z.infer<typeof creativeDirectorReviewOutputSchema>;

export const humanSelectionSchema = z
  .object({
    selectedRouteId: z.string().min(1),
    selectedAt: z.string().datetime().optional(),
    selectedBy: z.string().optional(),
    rationale: z.string().optional(),
  })
  .strict();

export type HumanSelection = z.infer<typeof humanSelectionSchema>;

export const campaignExecutionPlanSchema = z
  .object({
    selectedRouteId: z.string().min(1),
    planTitle: z.string().min(1),
    strategicSummary: z.string().min(1),
    assumptions: z.array(z.string().min(1)).min(1),
    launchPhases: z
      .array(
        z
          .object({
            phase: z.string().min(1),
            objective: z.string().min(1),
            timing: z.string().min(1),
            keyActions: z.array(z.string().min(1)).min(1),
            deliverables: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
    channelPlan: z
      .array(
        z
          .object({
            channel: z.string().min(1),
            role: z.string().min(1),
            recommendedAssets: z.array(z.string().min(1)).min(1),
            notes: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    assetList: z.array(z.string().min(1)).min(1),
    copyExamples: z.array(z.string().min(1)).min(1),
    measurementPlan: z
      .array(
        z
          .object({
            metric: z.string().min(1),
            purpose: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    risksAndMitigations: z
      .array(
        z
          .object({
            risk: z.string().min(1),
            mitigation: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    nextActions: z.array(z.string().min(1)).min(1),
    // Production-specific sections
    heroVisualSystem: z.string().min(1),
    shootList: z.array(z.string().min(1)).min(1),
    oohHeadlines: z.array(z.string().min(1)).min(1),
    paidSocialHooks: z.array(z.string().min(1)).min(1),
    landingPageBlocks: z
      .array(
        z
          .object({
            block: z.string().min(1),
            purpose: z.string().min(1),
            content: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    legalSubstantiationChecklist: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const campaignExecutionPlanOutputSchema = z
  .object({
    executionPlan: campaignExecutionPlanSchema,
  })
  .strict();

// Wrapper required because OpenAI JSON mode expects a JSON object, not a top-level array.
// Routes must be 3–5 meaningfully distinct strategic territories.
// Enforces: required strategic roles (safest, boldest, conversion) and unique route IDs.
export const campaignRoutesOutputSchema = z
  .object({
    routes: z.array(campaignRouteSchema).min(3).max(5),
  })
  .strict()
  .superRefine((value, ctx) => {
    const roles = value.routes.map((route) => route.strategicRole);

    for (const requiredRole of ["safest", "boldest", "conversion"] as const) {
      if (!roles.includes(requiredRole)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes"],
          message: `Campaign routes must include at least one "${requiredRole}" route.`,
        });
      }
    }

    const ids = new Set(value.routes.map((route) => route.id));
    if (ids.size !== value.routes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routes"],
        message: "Campaign route IDs must be unique.",
      });
    }
  });

export type CampaignRoutesOutput = z.infer<typeof campaignRoutesOutputSchema>;

// Wrapper for personas output.
// Personas are synthetic audience hypotheses for planning, not real research.
// Enforces: 3–6 unique personas by ID.
export const personasOutputSchema = z
  .object({
    personas: z.array(personaSchema).min(3).max(6),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.personas.map((persona) => persona.id));

    if (ids.size !== value.personas.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["personas"],
        message: "Persona IDs must be unique.",
      });
    }
  });

export type PersonasOutput = z.infer<typeof personasOutputSchema>;

// Wrapper for persona simulations output.
// Simulations are synthetic planning devices, not real audience research.
// Enforces: at least one simulation, unique route/persona pairs, and
// each caveat must clearly label the reaction as synthetic.
// Full route/persona matrix coverage is enforced at the stage level
// (validateSimulationCoverage) because the schema does not know the input sets.
export const personaSimulationsOutputSchema = z
  .object({
    simulations: z.array(personaSimulationSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const pairKeys = new Set<string>();

    for (const simulation of value.simulations) {
      const key = `${simulation.routeId}:${simulation.personaId}`;

      if (pairKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["simulations"],
          message: "Each route/persona simulation pair must be unique.",
        });
      }

      pairKeys.add(key);

      if (!simulation.caveat.toLowerCase().includes("synthetic")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["simulations"],
          message: "Each simulation caveat must clearly label the reaction as synthetic.",
        });
      }
    }
  });

export type PersonaSimulationsOutput = z.infer<typeof personaSimulationsOutputSchema>;

export type RawCampaignBrief = z.infer<typeof rawCampaignBriefSchema>;
export type NormalizedCampaignBrief = z.infer<typeof normalizedCampaignBriefSchema>;
export type StrategicTension = z.infer<typeof strategicTensionSchema>;
export type CampaignRoute = z.infer<typeof campaignRouteSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type PersonaSimulation = z.infer<typeof personaSimulationSchema>;
export type RouteScore = z.infer<typeof routeScoreSchema>;
export type PremortemReview = z.infer<typeof premortemReviewSchema>;
export type RouteComparisonRow = z.infer<typeof routeComparisonRowSchema>;
export type RouteComparisonMatrix = z.infer<typeof routeComparisonMatrixSchema>;
export type CampaignExecutionPlan = z.infer<typeof campaignExecutionPlanSchema>;
export type CampaignExecutionPlanOutput = z.infer<typeof campaignExecutionPlanOutputSchema>;

export const campaignRunOutputSchema = z
  .object({
    runId: z.string().min(1),
    status: z.literal("completed"),
    normalizedBrief: normalizedCampaignBriefSchema,
    strategicTension: strategicTensionSchema,
    routes: z.array(campaignRouteSchema).min(3).max(5),
    personas: z.array(personaSchema).min(3).max(6),
    simulations: z.array(personaSimulationSchema).min(1),
    scores: z.array(routeScoreSchema).min(1),
    premortemReview: premortemReviewSchema,
    comparison: routeComparisonMatrixSchema,
    creativeDirectorReview: creativeDirectorReviewSchema.optional(),
    traceEvents: z.array(traceEventSchema).min(1),
  })
  .strict();

export type CampaignRunOutput = z.infer<typeof campaignRunOutputSchema>;

export const campaignExportInputSchema = z
  .object({
    runId: z.string().optional(),
    normalizedBrief: normalizedCampaignBriefSchema,
    strategicTension: strategicTensionSchema,
    routes: z.array(campaignRouteSchema).min(1),
    personas: z.array(personaSchema).min(1),
    simulations: z.array(personaSimulationSchema).min(1),
    scores: z.array(routeScoreSchema).min(1),
    premortemReview: premortemReviewSchema,
    comparison: routeComparisonMatrixSchema,
    creativeDirectorReview: creativeDirectorReviewSchema.optional(),
    selectedRouteId: z.string().optional(),
    executionPlan: campaignExecutionPlanSchema.optional(),
    traceEvents: z.array(traceEventSchema).optional(),
    format: z.enum(["markdown", "html", "pptx"]).default("markdown"),
  })
  .strict();

export type CampaignExportInput = z.infer<typeof campaignExportInputSchema>;
