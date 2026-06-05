// Server-side only. Orchestrates brief extraction based on detected file type.

import { detectFileType, validateFileSize, MAX_EXTRACTED_CHARS } from "./file-validation";
import type { SupportedFileType } from "./file-validation";
import { extractTxtText } from "./extract-txt-text";
import { extractPdfText } from "./extract-pdf-text";
import { extractPptxText } from "./extract-pptx-text";

export interface BriefExtractionResult {
  fileName: string;
  fileType: SupportedFileType | "unsupported";
  extractedText: string;
  warnings: string[];
  stats: {
    characters: number;
    pages?: number;
    slides?: number;
  };
}

export async function extractBriefText(file: File): Promise<BriefExtractionResult> {
  const fileName = file.name;
  const fileType = detectFileType(fileName, file.type);

  if (fileType === "unsupported") {
    return {
      fileName,
      fileType: "unsupported",
      extractedText: "",
      warnings: [`Unsupported file type. Upload a PDF, PPTX, or TXT file.`],
      stats: { characters: 0 },
    };
  }

  const sizeCheck = validateFileSize(file.size);
  if (!sizeCheck.ok) {
    return {
      fileName,
      fileType,
      extractedText: "",
      warnings: [sizeCheck.message ?? "File is too large."],
      stats: { characters: 0 },
    };
  }

  const warnings: string[] = [];
  let rawText = "";
  let pages: number | undefined;
  let slides: number | undefined;

  if (fileType === "txt") {
    const result = await extractTxtText(file);
    rawText = result.text;
    warnings.push(...result.warnings);
  } else {
    const buffer = await file.arrayBuffer();

    if (fileType === "pdf") {
      const result = await extractPdfText(buffer);
      rawText = result.text;
      pages = result.pages;
      warnings.push(...result.warnings);
    } else {
      const result = await extractPptxText(buffer);
      rawText = result.text;
      slides = result.slides;
      warnings.push(...result.warnings);
    }
  }

  let extractedText = rawText;
  if (extractedText.length > MAX_EXTRACTED_CHARS) {
    extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARS);
    warnings.unshift(
      `Text was truncated to ${MAX_EXTRACTED_CHARS.toLocaleString()} characters. Review the preview before running.`,
    );
  }

  return {
    fileName,
    fileType,
    extractedText,
    warnings,
    stats: {
      characters: extractedText.length,
      pages,
      slides,
    },
  };
}
