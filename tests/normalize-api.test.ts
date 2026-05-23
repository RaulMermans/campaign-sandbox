// Tests for the POST /api/campaign/normalize route handler.
// Imports the handler directly — no HTTP server needed.
// Runs in mock provider mode (no OPENAI_API_KEY required).

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/normalize/route";
import { normalizedCampaignBriefSchema } from "@/lib/schemas/campaign";
import { traceEventSchema } from "@/lib/schemas/trace";

// A valid brief long enough to pass the 20-char minimum.
const VALID_BRIEF_TEXT =
  "Campaign for NOVA: sustainable urban clothing for creative professionals aged 25-35 in the UK. Budget GBP 5000-10000. Q1 next year. Tone: modern, clean, direct. No buzzwords or greenwashing.";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/campaign/normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("POST /api/campaign/normalize – input validation", () => {
  it("rejects a brief with text shorter than 20 characters", async () => {
    const response = await POST(makeRequest({ text: "Too short" }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Invalid brief input.");
  });

  it("rejects a missing text field", async () => {
    const response = await POST(makeRequest({ source: "paste" }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid source enum value", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT, source: "clipboard" }));
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost/api/campaign/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Mock provider — happy path
// ---------------------------------------------------------------------------

describe("POST /api/campaign/normalize – mock provider mode", () => {
  it("returns 200 with a valid normalizedBrief and traceEvent", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT, source: "paste" }));
    expect(response.status).toBe(200);

    const body = await response.json() as { normalizedBrief: unknown; traceEvent: unknown };
    expect(body.normalizedBrief).toBeDefined();
    expect(body.traceEvent).toBeDefined();
  });

  it("normalizedBrief validates against normalizedCampaignBriefSchema", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { normalizedBrief: unknown };
    expect(() => normalizedCampaignBriefSchema.parse(body.normalizedBrief)).not.toThrow();
  });

  it("traceEvent validates against traceEventSchema", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { traceEvent: unknown };
    expect(() => traceEventSchema.parse(body.traceEvent)).not.toThrow();
  });

  it("traceEvent shows provider: mock", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    const body = await response.json() as { traceEvent: { provider: string } };
    expect(body.traceEvent.provider).toBe("mock");
  });

  it("works without an explicit source field (defaults to paste)", async () => {
    const response = await POST(makeRequest({ text: VALID_BRIEF_TEXT }));
    expect(response.status).toBe(200);
  });
});
