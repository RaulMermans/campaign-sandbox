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

  if (result.fileType === "unsupported") {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, PPTX, or TXT file.", warnings: result.warnings },
      { status: 400 },
    );
  }

  if (!result.extractedText) {
    return NextResponse.json(
      {
        error: "No text could be extracted from this file.",
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
