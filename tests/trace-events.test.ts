import { describe, expect, it } from "vitest";
import { traceEventSchema } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";

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
});
