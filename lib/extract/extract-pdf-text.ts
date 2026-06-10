// Server-side only. PDF text extraction using pdf-parse v2 (PDFParse class API).
// OCR is not supported — image-only PDFs return an empty-text warning.

export interface PdfExtractionResult {
  text: string;
  pages?: number;
  warnings: string[];
  // True when the parsing library itself could not be loaded in this runtime —
  // distinct from a successful parse that found no text or a corrupted file.
  loadFailed?: boolean;
  // True when the library loaded but parsing the specific file failed
  // (corrupted, encrypted, or otherwise unreadable PDF structure).
  parseFailed?: boolean;
}

type PdfParseCtor = new (options: { data: Buffer }) => {
  getText: () => Promise<{ text: string; pages?: unknown[]; total?: number }>;
  destroy: () => Promise<void>;
};

// Strips pdf-parse's per-page footer markers (e.g. "-- 1 of 2 --") so that
// extracted text reflects only the document content.
function stripPageMarkers(text: string): string {
  return text.replace(/--\s*\d+ of \d+\s*--/g, "").trim();
}

export async function extractPdfText(
  buffer: ArrayBuffer,
): Promise<PdfExtractionResult> {
  const warnings: string[] = [];

  let PDFParse: PdfParseCtor;
  try {
    const mod: any = await import("pdf-parse");
    PDFParse = mod.PDFParse ?? mod.default?.PDFParse;
    if (typeof PDFParse !== "function") throw new Error("PDFParse export not found");
  } catch {
    return {
      text: "",
      warnings: ["PDF extraction failed in this environment. Try PPTX/TXT or paste the brief manually."],
      loadFailed: true,
    };
  }

  const nodeBuffer = Buffer.from(buffer);
  let parser: InstanceType<PdfParseCtor> | null = null;

  try {
    parser = new PDFParse({ data: nodeBuffer });
    const result = await parser.getText();
    const text = stripPageMarkers(result.text ?? "");
    const pages = Array.isArray(result.pages) ? result.pages.length : result.total;

    if (!text) {
      warnings.push(
        "No extractable text found. This PDF may contain only images or scanned content. OCR is not supported in v1. Please paste your brief as text.",
      );
    }

    return { text, pages, warnings };
  } catch {
    return {
      text: "",
      warnings: ["PDF extraction failed in this environment. Try PPTX/TXT or paste the brief manually."],
      parseFailed: true,
    };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup errors — extraction result already determined.
      }
    }
  }
}
