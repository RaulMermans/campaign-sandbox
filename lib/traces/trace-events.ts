import { traceEventSchema, type TraceEvent } from "@/lib/schemas/trace";

type TraceEventInput = Omit<TraceEvent, "id" | "timestamp" | "metadata"> & {
  id?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export function createTraceEvent(input: TraceEventInput): TraceEvent {
  return traceEventSchema.parse({
    id: input.id ?? `${input.runId}-${input.stageId}-${input.type}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
    metadata: input.metadata ?? {},
    ...input,
  });
}
