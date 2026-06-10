// Browser-local persistence for the internal Run Library.
// SAFETY: All data stays in the browser's localStorage — nothing is uploaded,
// shared, or sent to a server. No accounts, no database. This is a personal
// scratchpad for comparing past runs, not a synced or shareable workspace.
//
// Library entries are capped at SAVED_RUN_LIBRARY_CAP; saving beyond the cap
// silently drops the oldest entries. Import/export round-trips are validated
// against savedRunLibraryExportSchema so malformed local files cannot corrupt
// the library or crash the app.

import { z } from "zod";
import {
  SAVED_RUN_LIBRARY_CAP,
  savedCampaignRunSchema,
  savedRunLibraryExportSchema,
  type SavedCampaignRun,
  type SavedRunLibraryExport,
} from "@/lib/schemas/saved-run";
import type { CampaignExecutionPlan, CampaignRunOutput } from "@/lib/schemas/campaign";

const STORAGE_KEY = "campaign-sandbox:run-library:v1";
const EXPORT_VERSION = 1 as const;

const savedRunListSchema = z.array(savedCampaignRunSchema);

export { SAVED_RUN_LIBRARY_CAP };
export type { SavedCampaignRun, SavedRunLibraryExport };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `saved-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLibrary(): SavedCampaignRun[] {
  if (!isBrowser()) return [];

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = savedRunListSchema.safeParse(parsed);
  return result.success ? result.data : [];
}

function writeLibrary(runs: SavedCampaignRun[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // Storage may be full or unavailable (private browsing). Fail silently —
    // the in-memory state the caller already has remains the source of truth
    // for this session.
  }
}

function sortBySavedAtDesc(runs: SavedCampaignRun[]): SavedCampaignRun[] {
  return [...runs].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** List all saved runs, most recently saved first. */
export function listSavedRuns(): SavedCampaignRun[] {
  return sortBySavedAtDesc(readLibrary());
}

export interface SaveRunInput {
  name: string;
  run: CampaignRunOutput;
  selectedRouteId?: string;
  executionPlan?: CampaignExecutionPlan;
}

/**
 * Save a snapshot of a campaign run to the local library.
 * If the library is at capacity, the oldest entry is dropped to make room.
 */
export function saveRun(input: SaveRunInput): SavedCampaignRun {
  const entry: SavedCampaignRun = {
    id: generateId(),
    name: input.name.trim().length > 0 ? input.name.trim() : "Untitled run",
    savedAt: new Date().toISOString(),
    run: input.run,
    ...(input.selectedRouteId ? { selectedRouteId: input.selectedRouteId } : {}),
    ...(input.executionPlan ? { executionPlan: input.executionPlan } : {}),
  };

  const next = sortBySavedAtDesc([entry, ...readLibrary()]).slice(0, SAVED_RUN_LIBRARY_CAP);
  writeLibrary(next);
  return entry;
}

/** Load a single saved run by ID, or null if it does not exist. */
export function loadSavedRun(id: string): SavedCampaignRun | null {
  return readLibrary().find((entry) => entry.id === id) ?? null;
}

/** Duplicate a saved run as a new independent entry with a fresh ID and timestamp. */
export function duplicateSavedRun(id: string): SavedCampaignRun | null {
  const original = loadSavedRun(id);
  if (!original) return null;

  const copy: SavedCampaignRun = {
    ...original,
    id: generateId(),
    name: `${original.name} (copy)`,
    savedAt: new Date().toISOString(),
  };

  const next = sortBySavedAtDesc([copy, ...readLibrary()]).slice(0, SAVED_RUN_LIBRARY_CAP);
  writeLibrary(next);
  return copy;
}

/** Delete a single saved run by ID. No-op if it does not exist. */
export function deleteSavedRun(id: string): void {
  writeLibrary(readLibrary().filter((entry) => entry.id !== id));
}

/** Remove every saved run from the local library. */
export function clearSavedRuns(): void {
  writeLibrary([]);
}

function buildExportEnvelope(runs: SavedCampaignRun[]): SavedRunLibraryExport {
  return {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    runs,
  };
}

/** Export a single saved run as a validated, importable JSON envelope. */
export function exportSavedRun(id: string): SavedRunLibraryExport | null {
  const entry = loadSavedRun(id);
  if (!entry) return null;
  return buildExportEnvelope([entry]);
}

/** Export the entire local library as a validated, importable JSON envelope. */
export function exportSavedRunLibrary(): SavedRunLibraryExport | null {
  const runs = listSavedRuns();
  if (runs.length === 0) return null;
  return buildExportEnvelope(runs);
}

export interface ImportSavedRunsResult {
  imported: number;
  skipped: number;
  issues: string[];
}

/**
 * Import saved runs from a parsed JSON payload (the shape produced by
 * exportSavedRun / exportSavedRunLibrary). Validates the payload with Zod
 * before touching the library. Entries whose IDs already exist locally are
 * skipped rather than overwritten; the merged library is capped at
 * SAVED_RUN_LIBRARY_CAP, keeping the most recently saved entries.
 */
export function importSavedRuns(payload: unknown): ImportSavedRunsResult {
  const parsed = savedRunLibraryExportSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      imported: 0,
      skipped: 0,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
    };
  }

  const existing = readLibrary();
  const existingIds = new Set(existing.map((entry) => entry.id));

  const incoming = parsed.data.runs;
  const toAdd = incoming.filter((entry) => !existingIds.has(entry.id));
  const skipped = incoming.length - toAdd.length;

  const merged = sortBySavedAtDesc([...toAdd, ...existing]).slice(0, SAVED_RUN_LIBRARY_CAP);
  writeLibrary(merged);

  return { imported: toAdd.length, skipped, issues: [] };
}
