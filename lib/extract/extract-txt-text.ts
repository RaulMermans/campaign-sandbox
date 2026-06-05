// Server-side only. Plain text extraction — trivial but goes through the same interface.

export interface TxtExtractionResult {
  text: string;
  warnings: string[];
}

export async function extractTxtText(file: File): Promise<TxtExtractionResult> {
  const text = await file.text();
  return { text, warnings: [] };
}
