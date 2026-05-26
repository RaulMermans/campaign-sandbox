import { z } from "zod";

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
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
        currency: z.string().min(1),
      })
      .strict(),
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
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
        currency: z.string().min(1),
        notes: z.string(),
      })
      .strict(),
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
  })
  .strict();

export const routeComparisonMatrixSchema = z
  .object({
    criteria: z.array(z.string().min(1)).min(1),
    rows: z
      .array(
        z
          .object({
            routeId: z.string().min(1),
            routeName: z.string().min(1),
            strategicRole: z.enum(["safest", "boldest", "conversion"]),
            totalScore: z.number().min(1).max(5),
            strengths: z.array(z.string().min(1)).min(1),
            tradeoffs: z.array(z.string().min(1)).min(1),
            bestFor: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    recommendation: z.string().min(1),
    caveat: z.string().min(1),
  })
  .strict();

export const campaignExecutionPlanSchema = z
  .object({
    selectedRouteId: z.string().min(1),
    selectedRouteName: z.string().min(1),
    assumptions: z.array(z.string().min(1)).min(1),
    objectives: z.array(z.string().min(1)).min(1),
    channelPlan: z
      .array(
        z
          .object({
            channel: z.string().min(1),
            role: z.string().min(1),
            cadence: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    assetList: z.array(z.string().min(1)).min(1),
    timeline: z
      .array(
        z
          .object({
            phase: z.string().min(1),
            timing: z.string().min(1),
            actions: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
    metrics: z.array(z.string().min(1)).min(1),
    risks: z.array(z.string().min(1)).min(1),
    copyExamples: z.array(z.string().min(1)).min(1),
    nextActions: z.array(z.string().min(1)).min(1),
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

export type RawCampaignBrief = z.infer<typeof rawCampaignBriefSchema>;
export type NormalizedCampaignBrief = z.infer<typeof normalizedCampaignBriefSchema>;
export type StrategicTension = z.infer<typeof strategicTensionSchema>;
export type CampaignRoute = z.infer<typeof campaignRouteSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type PersonaSimulation = z.infer<typeof personaSimulationSchema>;
export type RouteScore = z.infer<typeof routeScoreSchema>;
export type PremortemReview = z.infer<typeof premortemReviewSchema>;
export type RouteComparisonMatrix = z.infer<typeof routeComparisonMatrixSchema>;
export type CampaignExecutionPlan = z.infer<typeof campaignExecutionPlanSchema>;
