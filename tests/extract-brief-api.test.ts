// Tests for POST /api/campaign/extract-brief route handler.
// No HTTP server. No file storage. No LLM calls.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/extract-brief/route";

function makeFormDataRequest(file: File): Request {
  const formData = new FormData();
  formData.append("file", file);
  return new Request("http://localhost/api/campaign/extract-brief", {
    method: "POST",
    body: formData,
  });
}

function makeBadRequest(): Request {
  return new Request("http://localhost/api/campaign/extract-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "not a file" }),
  });
}

describe("POST /api/campaign/extract-brief — input validation", () => {
  it("returns 400 for non-multipart request", async () => {
    const req = makeBadRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing file field", async () => {
    const formData = new FormData();
    formData.append("other", "value");
    const req = new Request("http://localhost/api/campaign/extract-brief", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for unsupported file type", async () => {
    const file = new File(["content"], "brief.docx", { type: "application/octet-stream" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });
});

describe("POST /api/campaign/extract-brief — TXT extraction", () => {
  it("returns 200 with extractedText for valid TXT", async () => {
    const file = new File(["This is a campaign brief about Luma Pantry."], "brief.txt", {
      type: "text/plain",
    });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      fileName: string;
      fileType: string;
      extractedText: string;
      warnings: string[];
      stats: { characters: number };
    };
    expect(body.fileType).toBe("txt");
    expect(body.extractedText).toContain("Luma Pantry");
    expect(body.stats.characters).toBeGreaterThan(0);
    expect(Array.isArray(body.warnings)).toBe(true);
  });

  it("does not include stack traces in response", async () => {
    const file = new File(["Brief content"], "brief.txt", { type: "text/plain" });
    const res = await POST(makeFormDataRequest(file));
    const text = await res.text();
    expect(text).not.toMatch(/at \w+ \(/);
    expect(text).not.toMatch(/node_modules/);
  });

  it("returns 422 for empty extraction", async () => {
    const file = new File([""], "empty.txt", { type: "text/plain" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });
});
