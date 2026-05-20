import { z } from "zod";
import {
  campaignExecutionPlanSchema,
  campaignRouteSchema,
  normalizedCampaignBriefSchema,
  personaSchema,
  personaSimulationSchema,
  premortemReviewSchema,
  rawCampaignBriefSchema,
  routeComparisonMatrixSchema,
  routeScoreSchema,
  strategicTensionSchema,
} from "./campaign";
import { traceEventSchema } from "./trace";

export const workflowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["llm", "deterministic", "human", "export"]),
    purpose: z.string().min(1),
    inputSchema: z.string().min(1),
    outputSchema: z.string().min(1),
    evals: z.array(z.string()).default([]),
    guardrails: z.array(z.string()).default([]),
  })
  .strict();

export const humanSelectionSchema = z
  .object({
    selectedRouteId: z.string().min(1),
    selectedBy: z.string().min(1),
    rationale: z.string().min(1),
    selectedAt: z.string().datetime(),
  })
  .strict();

export const campaignRunSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["draft", "running", "awaiting_selection", "completed", "failed"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    rawBrief: rawCampaignBriefSchema,
    normalizedBrief: normalizedCampaignBriefSchema,
    strategicTension: strategicTensionSchema,
    routes: z.array(campaignRouteSchema).length(3),
    personas: z.array(personaSchema).min(1),
    simulations: z.array(personaSimulationSchema).min(1),
    scores: z.array(routeScoreSchema).length(3),
    premortem: premortemReviewSchema,
    comparisonMatrix: routeComparisonMatrixSchema,
    humanSelection: humanSelectionSchema.optional(),
    executionPlan: campaignExecutionPlanSchema.optional(),
    traceEvents: z.array(traceEventSchema).min(1),
    disclaimer: z.string().min(1),
  })
  .strict();

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type HumanSelection = z.infer<typeof humanSelectionSchema>;
export type CampaignRun = z.infer<typeof campaignRunSchema>;
