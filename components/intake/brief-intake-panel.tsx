"use client";

import { useState } from "react";
import { BriefUploadPanel } from "./brief-upload-panel";
import type { UploadState } from "./brief-upload-panel";
import { ExtractedBriefPreview } from "./extracted-brief-preview";
import { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";

type IntakeMode = "paste" | "upload";

interface BriefIntakePanelProps {
  brief: string;
  onBriefChange: (text: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export function BriefIntakePanel({
  brief,
  onBriefChange,
  onRun,
  isRunning,
}: BriefIntakePanelProps) {
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("paste");
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  function handleUseSample() {
    onBriefChange(NODO_SAMPLE_BRIEF);
    setIntakeMode("paste");
    setUploadState({ status: "idle" });
  }

  const canRun = !isRunning && brief.trim().length >= 20;

  return (
    <div className="grid gap-4">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-md border border-stone-200 bg-stone-100 p-0.5">
        {(["paste", "upload"] as IntakeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setIntakeMode(mode)}
            className={[
              "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors capitalize",
              intakeMode === mode
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            ].join(" ")}
          >
            {mode === "paste" ? "Paste text" : "Upload file"}
          </button>
        ))}
      </div>

      {/* Paste mode */}
      {intakeMode === "paste" ? (
        <textarea
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          placeholder="Paste a messy campaign brief here — notes, emails, deck text, anything..."
          aria-label="Campaign brief"
          className="w-full rounded border border-stone-300 bg-white p-3 text-sm leading-6 text-stone-800 placeholder-stone-400 focus:border-stone-500 focus:outline-none"
          rows={9}
          spellCheck
        />
      ) : null}

      {/* Upload mode */}
      {intakeMode === "upload" ? (
        <div className="grid gap-3">
          <BriefUploadPanel
            uploadState={uploadState}
            setUploadState={setUploadState}
            onExtracted={(text) => onBriefChange(text)}
          />
          {uploadState.status === "extract-success" ? (
            <ExtractedBriefPreview
              fileName={uploadState.fileName}
              fileType={uploadState.fileType}
              extractedText={brief}
              warnings={uploadState.warnings}
              stats={uploadState.stats}
              onChange={onBriefChange}
            />
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running simulation…" : "Run simulation"}
        </button>
        <button
          type="button"
          onClick={handleUseSample}
          disabled={isRunning}
          className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900 disabled:opacity-50"
        >
          Use sample brief
        </button>
      </div>

      {brief.trim().length > 0 && brief.trim().length < 20 ? (
        <p className="text-xs text-stone-400">Brief is too short — add more context to run.</p>
      ) : null}
    </div>
  );
}
