// Server-side only. File validation for brief upload.

export type SupportedFileType = "pdf" | "pptx" | "txt";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_EXTRACTED_CHARS = 50_000;

const MIME_TO_TYPE: Record<string, SupportedFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
};

const EXT_TO_TYPE: Record<string, SupportedFileType> = {
  ".pdf": "pdf",
  ".pptx": "pptx",
  ".txt": "txt",
};

export function detectFileType(
  filename: string,
  mimeType: string,
): SupportedFileType | "unsupported" {
  const byMime = MIME_TO_TYPE[mimeType.toLowerCase().split(";")[0].trim()];
  if (byMime) return byMime;

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXT_TO_TYPE[ext] ?? "unsupported";
}

export function validateFileSize(bytes: number): { ok: boolean; message?: string } {
  if (bytes > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `File exceeds 15 MB limit (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
    };
  }
  return { ok: true };
}
