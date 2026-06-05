"use client";

import { useRef, useState } from "react";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "extracting" }
  | {
      status: "extract-success";
      fileName: string;
      fileType: string;
      extractedText: string;
      warnings: string[];
      stats: { characters: number; pages?: number; slides?: number };
    }
  | { status: "extract-error"; message: string; warnings?: string[] };

interface BriefUploadPanelProps {
  onExtracted: (text: string) => void;
  uploadState: UploadState;
  setUploadState: (state: UploadState) => void;
}

export function BriefUploadPanel({
  onExtracted,
  uploadState,
  setUploadState,
}: BriefUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadState({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    let data: unknown;
    try {
      setUploadState({ status: "extracting" });
      const res = await fetch("/api/campaign/extract-brief", {
        method: "POST",
        body: formData,
      });
      data = await res.json();
      if (!res.ok) {
        const d = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
        const warnings = Array.isArray(d.warnings) ? (d.warnings as string[]) : undefined;
        setUploadState({
          status: "extract-error",
          message: typeof d.error === "string" ? d.error : "Extraction failed.",
          warnings,
        });
        return;
      }
    } catch {
      setUploadState({ status: "extract-error", message: "Network error. Please try again." });
      return;
    }

    const d = data as {
      fileName: string;
      fileType: string;
      extractedText: string;
      warnings: string[];
      stats: { characters: number; pages?: number; slides?: number };
    };

    setUploadState({
      status: "extract-success",
      fileName: d.fileName,
      fileType: d.fileType,
      extractedText: d.extractedText,
      warnings: d.warnings,
      stats: d.stats,
    });

    onExtracted(d.extractedText);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const isLoading =
    uploadState.status === "uploading" || uploadState.status === "extracting";

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.pptx,.txt"
        className="sr-only"
        aria-label="Upload brief file"
        onChange={handleInputChange}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        disabled={isLoading}
        className={[
          "flex w-full flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed px-4 py-5 text-center transition-colors",
          isLoading
            ? "cursor-wait border-stone-200 bg-stone-50 opacity-60"
            : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50",
        ].join(" ")}
      >
        {isLoading ? (
          <>
            <span className="text-sm font-medium text-stone-600">
              {uploadState.status === "uploading" ? "Uploading…" : "Extracting text…"}
            </span>
            <span className="text-xs text-stone-400">This may take a moment</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-stone-700">
              Upload PDF, PPTX, or TXT
            </span>
            <span className="text-xs text-stone-400">
              Click to browse or drag and drop · Max 15 MB
            </span>
          </>
        )}
      </button>

      {uploadState.status === "extract-error" ? (
        <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-xs font-medium text-red-800">{uploadState.message}</p>
          {uploadState.warnings?.map((w) => (
            <p key={w} className="mt-0.5 text-xs text-red-700">
              {w}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
