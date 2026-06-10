"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  SAVED_RUN_LIBRARY_CAP,
  clearSavedRuns,
  deleteSavedRun,
  duplicateSavedRun,
  exportSavedRun,
  exportSavedRunLibrary,
  importSavedRuns,
  listSavedRuns,
  saveRun,
  type SavedCampaignRun,
} from "@/lib/storage/run-library";
import type { CampaignExecutionPlan, CampaignRunOutput } from "@/lib/schemas/campaign";

interface RunLibraryPanelProps {
  onClose: () => void;
  currentRun: CampaignRunOutput | null;
  currentSelectedRouteId: string | null;
  currentExecutionPlan: CampaignExecutionPlan | null;
  onLoadRun: (saved: SavedCampaignRun) => void;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function RunLibraryPanel({
  onClose,
  currentRun,
  currentSelectedRouteId,
  currentExecutionPlan,
  onLoadRun,
}: RunLibraryPanelProps) {
  const [runs, setRuns] = useState<SavedCampaignRun[]>(() => listSavedRuns());
  const [saveName, setSaveName] = useState(() =>
    currentRun ? `${currentRun.normalizedBrief.brandName} — ${new Date().toLocaleDateString()}` : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function refresh() {
    setRuns(listSavedRuns());
  }

  function handleSave() {
    if (!currentRun) return;
    saveRun({
      name: saveName,
      run: currentRun,
      ...(currentSelectedRouteId ? { selectedRouteId: currentSelectedRouteId } : {}),
      ...(currentExecutionPlan ? { executionPlan: currentExecutionPlan } : {}),
    });
    refresh();
    setMessage("Run saved to your local library.");
  }

  function handleLoad(saved: SavedCampaignRun) {
    onLoadRun(saved);
    onClose();
  }

  function handleDuplicate(id: string) {
    duplicateSavedRun(id);
    refresh();
    setMessage("Run duplicated.");
  }

  function handleDelete(id: string) {
    deleteSavedRun(id);
    refresh();
    setMessage("Run deleted.");
  }

  function handleExportOne(id: string) {
    const envelope = exportSavedRun(id);
    if (!envelope) return;
    downloadJson(`campaign-saved-run-${id}.json`, envelope);
  }

  function handleExportAll() {
    const envelope = exportSavedRunLibrary();
    if (!envelope) {
      setMessage("Library is empty — nothing to export.");
      return;
    }
    downloadJson("campaign-run-library.json", envelope);
  }

  function handleClearAll() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearSavedRuns();
    refresh();
    setConfirmingClear(false);
    setMessage("Library cleared.");
  }

  async function handleImportFile(file: File) {
    setMessage(null);
    try {
      const text = await file.text();
      const payload: unknown = JSON.parse(text);
      const result = importSavedRuns(payload);
      refresh();
      if (result.issues.length > 0) {
        setMessage(`Import failed: ${result.issues[0]}`);
      } else {
        setMessage(`Imported ${result.imported} run(s)${result.skipped > 0 ? `, skipped ${result.skipped} already-saved` : ""}.`);
      }
    } catch {
      setMessage("Import failed: file is not valid JSON.");
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-stone-950/40 px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl border border-stone-300 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-950">Run Library</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Saved locally in this browser only — not uploaded or shared. Capped at {SAVED_RUN_LIBRARY_CAP} runs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {message ? (
            <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
              {message}
            </div>
          ) : null}

          {/* Save current run */}
          {currentRun ? (
            <div className="mb-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
                Save current run
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Name this run"
                  className="min-w-[200px] flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-stone-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveName.trim().length === 0}
                  className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save to library
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-5 text-xs text-stone-500">
              Run a campaign to be able to save it here for later comparison.
            </p>
          )}

          {/* Library actions */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900"
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={handleExportAll}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900"
            >
              Export all
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className={[
                "rounded border px-3 py-1.5 text-xs font-medium",
                confirmingClear
                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900",
              ].join(" ")}
            >
              {confirmingClear ? "Click again to confirm clear" : "Clear all"}
            </button>
            <span className="ml-auto text-xs text-stone-400">
              {runs.length} / {SAVED_RUN_LIBRARY_CAP} saved
            </span>
          </div>

          {/* Saved runs list */}
          {runs.length === 0 ? (
            <p className="rounded-md border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-400">
              No saved runs yet.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {runs.map((saved) => (
                <li key={saved.id} className="rounded-lg border border-stone-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{saved.name}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Saved {formatSavedAt(saved.savedAt)} · {saved.run.normalizedBrief.brandName} ·{" "}
                        {saved.run.routes.length} route{saved.run.routes.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {saved.selectedRouteId ? <Badge>route selected</Badge> : null}
                        {saved.executionPlan ? <Badge>execution plan</Badge> : null}
                        {saved.run.creativeDirectorReview ? <Badge>creative review</Badge> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleLoad(saved)}
                        className="rounded border border-stone-900 bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-800"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(saved.id)}
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportOne(saved.id)}
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900"
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(saved.id)}
                        className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
