// Tests for lib/extract/ utilities.
// No file storage, no LLM calls, no real uploads.

import { describe, expect, it } from "vitest";
import { detectFileType, validateFileSize, MAX_FILE_SIZE_BYTES, MAX_EXTRACTED_CHARS } from "@/lib/extract/file-validation";
import { extractTxtText } from "@/lib/extract/extract-txt-text";
import { extractPptxText } from "@/lib/extract/extract-pptx-text";
import { extractBriefText } from "@/lib/extract/extract-brief-text";
import JSZip from "jszip";

// ---------------------------------------------------------------------------
// file-validation
// ---------------------------------------------------------------------------

describe("detectFileType", () => {
  it("detects PDF by MIME type", () => {
    expect(detectFileType("brief.pdf", "application/pdf")).toBe("pdf");
  });

  it("detects PPTX by MIME type", () => {
    expect(detectFileType("brief.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("pptx");
  });

  it("detects TXT by MIME type", () => {
    expect(detectFileType("brief.txt", "text/plain")).toBe("txt");
  });

  it("detects PDF by extension when MIME is generic", () => {
    expect(detectFileType("brief.pdf", "application/octet-stream")).toBe("pdf");
  });

  it("detects PPTX by extension when MIME is generic", () => {
    expect(detectFileType("deck.pptx", "application/octet-stream")).toBe("pptx");
  });

  it("returns unsupported for unknown extension", () => {
    expect(detectFileType("brief.docx", "application/octet-stream")).toBe("unsupported");
  });

  it("returns unsupported for unknown MIME with no recognized extension", () => {
    expect(detectFileType("brief.xyz", "application/xyz")).toBe("unsupported");
  });
});

describe("validateFileSize", () => {
  it("accepts files at the limit", () => {
    expect(validateFileSize(MAX_FILE_SIZE_BYTES).ok).toBe(true);
  });

  it("rejects files exceeding the limit", () => {
    const result = validateFileSize(MAX_FILE_SIZE_BYTES + 1);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/15 MB/);
  });

  it("accepts small files", () => {
    expect(validateFileSize(1024).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TXT extraction
// ---------------------------------------------------------------------------

describe("extractTxtText", () => {
  it("extracts text from a TXT file", async () => {
    const file = new File(["Hello, this is a campaign brief."], "brief.txt", { type: "text/plain" });
    const result = await extractTxtText(file);
    expect(result.text).toBe("Hello, this is a campaign brief.");
    expect(result.warnings).toHaveLength(0);
  });

  it("preserves multiline text", async () => {
    const content = "Line 1\nLine 2\nLine 3";
    const file = new File([content], "brief.txt", { type: "text/plain" });
    const result = await extractTxtText(file);
    expect(result.text).toBe(content);
  });
});

// ---------------------------------------------------------------------------
// PPTX extraction
// ---------------------------------------------------------------------------

async function makePptxBuffer(slides: string[]): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    const xml = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody>
      <a:p><a:r><a:t>${slides[i]}</a:t></a:r></a:p>
    </p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;
    zip.file(`ppt/slides/slide${i + 1}.xml`, xml);
  }
  const buf = await zip.generateAsync({ type: "arraybuffer" });
  return buf;
}

describe("extractPptxText", () => {
  it("extracts text from PPTX slides", async () => {
    const buffer = await makePptxBuffer(["Campaign Brief", "Target Audience"]);
    const result = await extractPptxText(buffer);
    expect(result.text).toContain("Campaign Brief");
    expect(result.text).toContain("Target Audience");
    expect(result.slides).toBe(2);
  });

  it("includes speaker notes warning", async () => {
    const buffer = await makePptxBuffer(["Slide 1 text"]);
    const result = await extractPptxText(buffer);
    expect(result.warnings.some((w) => w.toLowerCase().includes("speaker note"))).toBe(true);
  });

  it("returns empty with warning for ZIP with no slides", async () => {
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", "<prs/>");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await extractPptxText(buffer);
    expect(result.text).toBe("");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns error for non-zip content", async () => {
    const buffer = new TextEncoder().encode("not a zip file").buffer;
    const result = await extractPptxText(buffer);
    expect(result.text).toBe("");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// extractBriefText — integration
// ---------------------------------------------------------------------------

describe("extractBriefText", () => {
  it("extracts TXT brief end-to-end", async () => {
    const file = new File(["A campaign brief about Luma Pantry."], "brief.txt", { type: "text/plain" });
    const result = await extractBriefText(file);
    expect(result.fileType).toBe("txt");
    expect(result.extractedText).toContain("Luma Pantry");
    expect(result.stats.characters).toBeGreaterThan(0);
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["content"], "brief.docx", { type: "application/octet-stream" });
    const result = await extractBriefText(file);
    expect(result.fileType).toBe("unsupported");
    expect(result.extractedText).toBe("");
    expect(result.errorCode).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("truncates text exceeding MAX_EXTRACTED_CHARS and adds warning", async () => {
    const longText = "x".repeat(MAX_EXTRACTED_CHARS + 1000);
    const file = new File([longText], "brief.txt", { type: "text/plain" });
    const result = await extractBriefText(file);
    expect(result.extractedText.length).toBe(MAX_EXTRACTED_CHARS);
    expect(result.warnings.some((w) => w.toLowerCase().includes("truncated"))).toBe(true);
  });

  it("rejects files exceeding max size", async () => {
    const bigContent = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([bigContent], "big.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });
    const result = await extractBriefText(file);
    expect(result.extractedText).toBe("");
    expect(result.warnings.some((w) => w.toLowerCase().includes("large") || w.toLowerCase().includes("15 mb"))).toBe(true);
    expect(result.errorCode).toBe("FILE_TOO_LARGE");
  });

  it("returns EMPTY_EXTRACTION errorCode for empty TXT file", async () => {
    const file = new File([""], "empty.txt", { type: "text/plain" });
    const result = await extractBriefText(file);
    expect(result.extractedText).toBe("");
    expect(result.errorCode).toBe("EMPTY_EXTRACTION");
  });

  it("returns no errorCode for valid extraction", async () => {
    const file = new File(["A brief."], "brief.txt", { type: "text/plain" });
    const result = await extractBriefText(file);
    expect(result.errorCode).toBeUndefined();
  });

  it("does not expose raw stack traces in warnings", async () => {
    const file = new File(["Brief content"], "brief.txt", { type: "text/plain" });
    const result = await extractBriefText(file);
    for (const warning of result.warnings) {
      expect(warning).not.toMatch(/at \w+ \(/);
      expect(warning).not.toMatch(/Error:/);
    }
  });
});
