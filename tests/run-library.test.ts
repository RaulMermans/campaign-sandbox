// Tests for lib/storage/run-library.ts — browser-local Run Library persistence.
// SAFETY: This is local-only storage (localStorage). No network calls, no
// accounts. Tests run in a Node environment, so `window`/`localStorage` are
// stubbed with an in-memory implementation.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAVED_RUN_LIBRARY_CAP,
  clearSavedRuns,
  deleteSavedRun,
  duplicateSavedRun,
  exportSavedRun,
  exportSavedRunLibrary,
  importSavedRuns,
  listSavedRuns,
  loadSavedRun,
  saveRun,
} from "@/lib/storage/run-library";
import { campaignRunOutputSchema, type CampaignRunOutput } from "@/lib/schemas/campaign";
import { savedRunLibraryExportSchema } from "@/lib/schemas/saved-run";
import { buildMockCompletedCampaignRun } from "@/lib/workflow/mock-campaign-run";

// ---------------------------------------------------------------------------
// In-memory localStorage stub
// ---------------------------------------------------------------------------

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

let memoryStorage: MemoryStorage;

beforeEach(() => {
  memoryStorage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: memoryStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Fixture: a valid CampaignRunOutput built from the mock campaign run
// ---------------------------------------------------------------------------

const MOCK_RUN: CampaignRunOutput = (() => {
  const run = buildMockCompletedCampaignRun();
  return campaignRunOutputSchema.parse({
    runId: run.id,
    status: "completed",
    normalizedBrief: run.normalizedBrief,
    strategicTension: run.strategicTension,
    routes: run.routes,
    personas: run.personas,
    simulations: run.simulations,
    scores: run.scores,
    premortemReview: run.premortem,
    comparison: run.comparisonMatrix,
    creativeDirectorReview: run.creativeDirectorReview,
    traceEvents: run.traceEvents,
  });
})();

// ---------------------------------------------------------------------------
// Basic save / list / load
// ---------------------------------------------------------------------------

describe("saveRun / listSavedRuns / loadSavedRun", () => {
  it("returns an empty list when nothing has been saved", () => {
    expect(listSavedRuns()).toEqual([]);
  });

  it("saves a run and lists it back", () => {
    const saved = saveRun({ name: "First run", run: MOCK_RUN });
    const all = listSavedRuns();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe(saved.id);
    expect(all[0]?.name).toBe("First run");
  });

  it("assigns an id and an ISO savedAt timestamp", () => {
    const saved = saveRun({ name: "Timestamped", run: MOCK_RUN });
    expect(saved.id.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
  });

  it("falls back to 'Untitled run' for a blank name", () => {
    const saved = saveRun({ name: "   ", run: MOCK_RUN });
    expect(saved.name).toBe("Untitled run");
  });

  it("trims whitespace from the provided name", () => {
    const saved = saveRun({ name: "  Padded name  ", run: MOCK_RUN });
    expect(saved.name).toBe("Padded name");
  });

  it("persists optional selectedRouteId and executionPlan only when provided", () => {
    const withExtras = saveRun({
      name: "With extras",
      run: MOCK_RUN,
      selectedRouteId: MOCK_RUN.routes[0]!.id,
    });
    expect(withExtras.selectedRouteId).toBe(MOCK_RUN.routes[0]!.id);
    expect(withExtras.executionPlan).toBeUndefined();

    const withoutExtras = saveRun({ name: "Without extras", run: MOCK_RUN });
    expect(withoutExtras.selectedRouteId).toBeUndefined();
    expect(withoutExtras.executionPlan).toBeUndefined();
  });

  it("lists saved runs most-recently-saved first", () => {
    const first = saveRun({ name: "Older", run: MOCK_RUN });
    // Force a distinguishable savedAt ordering regardless of clock resolution.
    const all1 = listSavedRuns();
    expect(all1[0]?.id).toBe(first.id);

    const second = saveRun({ name: "Newer", run: MOCK_RUN });
    const all2 = listSavedRuns();
    expect(all2[0]?.id).toBe(second.id);
    expect(all2[1]?.id).toBe(first.id);
  });

  it("loads a saved run by id", () => {
    const saved = saveRun({ name: "Loadable", run: MOCK_RUN });
    const loaded = loadSavedRun(saved.id);
    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.name).toBe("Loadable");
  });

  it("returns null when loading an unknown id", () => {
    expect(loadSavedRun("does-not-exist")).toBeNull();
  });

  it("every saved entry validates against savedCampaignRunSchema (round trip)", () => {
    saveRun({ name: "Schema check", run: MOCK_RUN, selectedRouteId: MOCK_RUN.routes[0]!.id });
    const all = listSavedRuns();
    expect(all).toHaveLength(1);
    expect(() => campaignRunOutputSchema.parse(all[0]!.run)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Duplicate / delete / clear
// ---------------------------------------------------------------------------

describe("duplicateSavedRun / deleteSavedRun / clearSavedRuns", () => {
  it("duplicates a saved run with a new id, name suffix, and timestamp", () => {
    const original = saveRun({ name: "Original", run: MOCK_RUN });
    const copy = duplicateSavedRun(original.id);

    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(original.id);
    expect(copy!.name).toBe("Original (copy)");

    const all = listSavedRuns();
    expect(all).toHaveLength(2);
    expect(all.map((entry) => entry.id).sort()).toEqual([copy!.id, original.id].sort());
  });

  it("returns null when duplicating an unknown id", () => {
    expect(duplicateSavedRun("missing")).toBeNull();
    expect(listSavedRuns()).toHaveLength(0);
  });

  it("deletes a saved run by id", () => {
    const a = saveRun({ name: "A", run: MOCK_RUN });
    const b = saveRun({ name: "B", run: MOCK_RUN });

    deleteSavedRun(a.id);

    const all = listSavedRuns();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe(b.id);
  });

  it("is a no-op when deleting an unknown id", () => {
    saveRun({ name: "Keep me", run: MOCK_RUN });
    deleteSavedRun("missing");
    expect(listSavedRuns()).toHaveLength(1);
  });

  it("clears every saved run", () => {
    saveRun({ name: "A", run: MOCK_RUN });
    saveRun({ name: "B", run: MOCK_RUN });
    clearSavedRuns();
    expect(listSavedRuns()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cap enforcement
// ---------------------------------------------------------------------------

describe("library cap enforcement", () => {
  it("never exceeds SAVED_RUN_LIBRARY_CAP entries when saving repeatedly", () => {
    for (let i = 0; i < SAVED_RUN_LIBRARY_CAP + 5; i += 1) {
      saveRun({ name: `Run ${i}`, run: MOCK_RUN });
    }
    expect(listSavedRuns()).toHaveLength(SAVED_RUN_LIBRARY_CAP);
  });

  it("keeps the most-recently-saved entries when the cap is exceeded", () => {
    const saved: { id: string; name: string }[] = [];
    for (let i = 0; i < SAVED_RUN_LIBRARY_CAP + 3; i += 1) {
      saved.push(saveRun({ name: `Run ${i}`, run: MOCK_RUN }));
    }
    const remainingIds = new Set(listSavedRuns().map((entry) => entry.id));
    // The earliest 3 saves should have been dropped to make room.
    expect(remainingIds.has(saved[0]!.id)).toBe(false);
    expect(remainingIds.has(saved[1]!.id)).toBe(false);
    expect(remainingIds.has(saved[2]!.id)).toBe(false);
    // The most recent save must still be present.
    expect(remainingIds.has(saved[saved.length - 1]!.id)).toBe(true);
  });

  it("also enforces the cap when duplicating at capacity", () => {
    let last = saveRun({ name: "Run 0", run: MOCK_RUN });
    for (let i = 1; i < SAVED_RUN_LIBRARY_CAP; i += 1) {
      last = saveRun({ name: `Run ${i}`, run: MOCK_RUN });
    }
    expect(listSavedRuns()).toHaveLength(SAVED_RUN_LIBRARY_CAP);

    duplicateSavedRun(last.id);
    expect(listSavedRuns()).toHaveLength(SAVED_RUN_LIBRARY_CAP);
  });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

describe("exportSavedRun / exportSavedRunLibrary", () => {
  it("returns null when exporting an unknown single run", () => {
    expect(exportSavedRun("missing")).toBeNull();
  });

  it("returns null when exporting an empty library", () => {
    expect(exportSavedRunLibrary()).toBeNull();
  });

  it("exports a single run as a validated envelope", () => {
    const saved = saveRun({ name: "Exportable", run: MOCK_RUN });
    const envelope = exportSavedRun(saved.id);

    expect(envelope).not.toBeNull();
    expect(envelope!.version).toBe(1);
    expect(envelope!.runs).toHaveLength(1);
    expect(envelope!.runs[0]?.id).toBe(saved.id);
    expect(() => savedRunLibraryExportSchema.parse(envelope)).not.toThrow();
  });

  it("exports the whole library as a validated envelope", () => {
    saveRun({ name: "A", run: MOCK_RUN });
    saveRun({ name: "B", run: MOCK_RUN });
    const envelope = exportSavedRunLibrary();

    expect(envelope).not.toBeNull();
    expect(envelope!.runs).toHaveLength(2);
    expect(() => savedRunLibraryExportSchema.parse(envelope)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

describe("importSavedRuns", () => {
  it("imports runs from a previously exported envelope", () => {
    saveRun({ name: "Exported", run: MOCK_RUN });
    const envelope = exportSavedRunLibrary()!;
    clearSavedRuns();

    const result = importSavedRuns(envelope);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.issues).toEqual([]);
    expect(listSavedRuns()).toHaveLength(1);
  });

  it("skips entries whose ids already exist locally rather than overwriting them", () => {
    const saved = saveRun({ name: "Original name", run: MOCK_RUN });
    const envelope = exportSavedRun(saved.id)!;

    const result = importSavedRuns(envelope);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(listSavedRuns()).toHaveLength(1);
    expect(listSavedRuns()[0]?.name).toBe("Original name");
  });

  it("reports issues and imports nothing for a malformed payload", () => {
    const result = importSavedRuns({ not: "a valid envelope" });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(listSavedRuns()).toEqual([]);
  });

  it("reports issues for a payload with the wrong version", () => {
    saveRun({ name: "Existing", run: MOCK_RUN });
    const envelope = exportSavedRunLibrary()!;
    const badEnvelope = { ...envelope, version: 2 };

    const result = importSavedRuns(badEnvelope);

    expect(result.imported).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("enforces the library cap when merging imported runs", () => {
    for (let i = 0; i < SAVED_RUN_LIBRARY_CAP; i += 1) {
      saveRun({ name: `Existing ${i}`, run: MOCK_RUN });
    }
    const envelope = {
      exportedAt: new Date().toISOString(),
      version: 1 as const,
      runs: [
        {
          id: "imported-run-1",
          name: "Imported",
          savedAt: new Date(Date.now() + 60_000).toISOString(),
          run: MOCK_RUN,
        },
      ],
    };

    const result = importSavedRuns(envelope);

    expect(result.imported).toBe(1);
    expect(listSavedRuns()).toHaveLength(SAVED_RUN_LIBRARY_CAP);
    expect(listSavedRuns().some((entry) => entry.id === "imported-run-1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No-browser environment (SSR-safety)
// ---------------------------------------------------------------------------

describe("graceful behavior without a browser environment", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list and performs no-ops when window is unavailable", () => {
    expect(listSavedRuns()).toEqual([]);
    expect(loadSavedRun("anything")).toBeNull();
    expect(exportSavedRunLibrary()).toBeNull();

    // These should not throw even though there is nowhere to persist to.
    expect(() => saveRun({ name: "No-op save", run: MOCK_RUN })).not.toThrow();
    expect(() => deleteSavedRun("anything")).not.toThrow();
    expect(() => clearSavedRuns()).not.toThrow();
  });
});
