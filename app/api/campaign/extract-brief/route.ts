export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { extractBriefText } from "@/lib/extract/extract-brief-text";

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in form data." },
      { status: 400 },
    );
  }

  const result = await extractBriefText(file);

  if (result.errorCode === "FILE_TOO_LARGE") {
    return NextResponse.json(
      { error: "File is too large. Maximum upload size is 15MB.", code: "FILE_TOO_LARGE" },
      { status: 413 },
    );
  }

  if (result.errorCode === "UNSUPPORTED_FILE_TYPE") {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, PPTX, or TXT.", code: "UNSUPPORTED_FILE_TYPE" },
      { status: 400 },
    );
  }

  if (result.errorCode === "EMPTY_EXTRACTION") {
    return NextResponse.json(
      {
        error: "No extractable text found. OCR is not supported in v1. Try a selectable-text PDF or paste the brief manually.",
        code: "EMPTY_EXTRACTION",
        warnings: result.warnings,
        fileName: result.fileName,
        fileType: result.fileType,
      },
      { status: 422 },
    );
  }

  if (result.errorCode === "EXTRACTION_FAILED") {
    return NextResponse.json(
      {
        error: "PDF extraction failed in this environment. Try PPTX/TXT or paste the brief manually.",
        code: "EXTRACTION_FAILED",
        warnings: result.warnings,
        fileName: result.fileName,
        fileType: result.fileType,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    fileName: result.fileName,
    fileType: result.fileType,
    extractedText: result.extractedText,
    warnings: result.warnings,
    stats: result.stats,
  });
}
