// Schemas for the internal Run Library — browser-local saved campaign runs.
// SAFETY: This is local persistence only (browser storage). No accounts, no
// server-side database, no sharing. Saved runs carry the same disclaimers as
// the runs they snapshot.

import { z } from "zod";
import { campaignExecutionPlanSchema, campaignRunOutputSchema } from "./campaign";

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid datetime",
});

// Hard cap on the number of runs kept in the local library. Oldest entries
// are dropped first when the cap is exceeded.
export const SAVED_RUN_LIBRARY_CAP = 25;

export const savedCampaignRunSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    savedAt: isoDateTimeSchema,
    run: campaignRunOutputSchema,
    selectedRouteId: z.string().optional(),
    executionPlan: campaignExecutionPlanSchema.optional(),
  })
  .strict();

export type SavedCampaignRun = z.infer<typeof savedCampaignRunSchema>;

export const savedRunLibraryExportSchema = z
  .object({
    exportedAt: isoDateTimeSchema,
    version: z.literal(1),
    runs: z.array(savedCampaignRunSchema).min(1).max(SAVED_RUN_LIBRARY_CAP),
  })
  .strict();

export type SavedRunLibraryExport = z.infer<typeof savedRunLibraryExportSchema>;
