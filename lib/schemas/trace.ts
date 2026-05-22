import { z } from "zod";

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid datetime",
});

export const traceEventSchema = z
  .object({
    id: z.string().min(1),
    runId: z.string().min(1),
    stageId: z.string().min(1),
    type: z.enum([
      "workflow.started",
      "stage.pending",
      "stage.started",
      "stage.completed",
      "stage.failed",
      "workflow.completed",
    ]),
    status: z.enum(["pending", "running", "completed", "failed"]),
    message: z.string().min(1),
    timestamp: isoDateTimeSchema,
    durationMs: z.number().nonnegative().optional(),
    inputSchema: z.string().optional(),
    outputSchema: z.string().optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    costUsd: z.number().nonnegative().optional(),
    evalIds: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type TraceEvent = z.infer<typeof traceEventSchema>;
