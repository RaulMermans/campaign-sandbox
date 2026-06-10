// Tests for POST /api/campaign/extract-brief route handler.
// No HTTP server. No file storage. No LLM calls.

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/campaign/extract-brief/route";
import { buildSelectableTextPdf, buildEmptyTextPdf, buildCorruptPdf } from "./fixtures/build-test-pdf";

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

  it("returns 400 with UNSUPPORTED_FILE_TYPE code for unsupported file type", async () => {
    const file = new File(["content"], "brief.docx", { type: "application/octet-stream" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; code: string };
    expect(body.error).toBeTruthy();
    expect(body.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("returns 413 with FILE_TOO_LARGE code for oversized file", async () => {
    const { MAX_FILE_SIZE_BYTES } = await import("@/lib/extract/file-validation");
    const bigContent = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([bigContent], "big.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(413);
    const body = await res.json() as { error: string; code: string };
    expect(body.error).toContain("15MB");
    expect(body.code).toBe("FILE_TOO_LARGE");
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

  it("returns 422 with EMPTY_EXTRACTION code for empty file", async () => {
    const file = new File([""], "empty.txt", { type: "text/plain" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string; code: string };
    expect(body.error).toBeTruthy();
    expect(body.code).toBe("EMPTY_EXTRACTION");
  });
});

describe("POST /api/campaign/extract-brief — PDF extraction", () => {
  it("returns 200 with extractedText for selectable-text PDF", async () => {
    const pdfBuffer = buildSelectableTextPdf("Quarterly campaign brief notes");
    const file = new File([new Uint8Array(pdfBuffer)], "brief.pdf", { type: "application/pdf" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(200);
    const body = await res.json() as { fileType: string; extractedText: string; code?: string };
    expect(body.fileType).toBe("pdf");
    expect(body.extractedText).toContain("Quarterly campaign brief notes");
    expect(body.code).toBeUndefined();
  });

  it("returns 422 EMPTY_EXTRACTION with OCR-not-supported message for image-only PDFs", async () => {
    const pdfBuffer = buildEmptyTextPdf();
    const file = new File([new Uint8Array(pdfBuffer)], "scanned.pdf", { type: "application/pdf" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string; code: string };
    expect(body.code).toBe("EMPTY_EXTRACTION");
    expect(body.error.toLowerCase()).toContain("ocr is not supported");
  });

  it("returns 422 EXTRACTION_FAILED with sanitized message for corrupted PDFs", async () => {
    const pdfBuffer = buildCorruptPdf();
    const file = new File([new Uint8Array(pdfBuffer)], "corrupt.pdf", { type: "application/pdf" });
    const res = await POST(makeFormDataRequest(file));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string; code: string };
    expect(body.code).toBe("EXTRACTION_FAILED");
    expect(body.error).toBe("PDF extraction failed in this environment. Try PPTX/TXT or paste the brief manually.");
  });

  it("does not expose stack traces or internal paths for PDF errors", async () => {
    const pdfBuffer = buildCorruptPdf();
    const file = new File([new Uint8Array(pdfBuffer)], "corrupt.pdf", { type: "application/pdf" });
    const res = await POST(makeFormDataRequest(file));
    const text = await res.text();
    expect(text).not.toMatch(/at \w+ \(/);
    expect(text).not.toMatch(/node_modules/);
    expect(text).not.toMatch(/Error:/);
  });
});
