// Server-side only. PDF text extraction using pdf-parse.
// OCR is not supported — image-only PDFs return an empty-text warning.

export interface PdfExtractionResult {
  text: string;
  pages?: number;
  warnings: string[];
}

type PdfParseResult = { text: string; numpages: number };
type PdfParseFn = (buf: Buffer) => Promise<PdfParseResult>;

export async function extractPdfText(
  buffer: ArrayBuffer,
): Promise<PdfExtractionResult> {
  const warnings: string[] = [];

  let parseFn: PdfParseFn;
  try {
    // pdf-parse exports itself as a CommonJS default function.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const mod: any = await import("pdf-parse");
    // Handle both { default: fn } and fn directly.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    parseFn = typeof mod === "function" ? mod : typeof mod.default === "function" ? mod.default : null;
    if (!parseFn) throw new Error("pdf-parse not callable");
  } catch {
    return {
      text: "",
      warnings: ["PDF parsing library failed to load. Please paste your brief as text."],
    };
  }

  const nodeBuffer = Buffer.from(buffer);

  let result: PdfParseResult;
  try {
    result = await parseFn(nodeBuffer);
  } catch {
    return {
      text: "",
      warnings: ["PDF could not be parsed. The file may be corrupted or encrypted."],
    };
  }

  const text = result.text.trim();

  if (!text) {
    warnings.push(
      "No extractable text found. This PDF may contain only images or scanned content. OCR is not supported in v1. Please paste your brief as text.",
    );
  }

  return { text, pages: result.numpages, warnings };
}
