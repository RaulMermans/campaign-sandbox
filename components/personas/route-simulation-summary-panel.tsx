"use client";

import { useState } from "react";
import type { RouteSimulationSummary } from "@/lib/workflow/derive-route-simulation-summaries";

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-stone-100">
        <div
          className="h-1.5 rounded-full bg-stone-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-stone-600">{value.toFixed(1)}</span>
    </div>
  );
}

interface RouteSimulationSummaryPanelProps {
  summaries: RouteSimulationSummary[];
  onExpandPersonas?: () => void;
  personasExpanded: boolean;
}

export function RouteSimulationSummaryPanel({
  summaries,
  onExpandPersonas,
  personasExpanded,
}: RouteSimulationSummaryPanelProps) {
  if (summaries.length === 0) return null;

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-stone-100 bg-stone-50 px-4 py-2.5 text-xs leading-5 text-stone-400">
        Route-level synthesis derived from synthetic persona simulations. Not real audience research.
      </div>

      <div className="workspace-wide grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <div
            key={s.routeId}
            className="rounded-lg border border-stone-200 bg-white p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
              {s.routeName}
            </p>

            <div className="mb-3 grid grid-cols-3 gap-2 text-xs text-stone-500">
              <div>
                <p className="mb-1 font-medium text-stone-400">Resonance</p>
                <ScoreBar value={s.averageResonance} />
              </div>
              <div>
                <p className="mb-1 font-medium text-stone-400">Conversion</p>
                <ScoreBar value={s.averageConversion} />
              </div>
              <div>
                <p className="mb-1 font-medium text-stone-400">Email</p>
                <ScoreBar value={s.averageEmailCapture} />
              </div>
            </div>

            <div className="grid gap-2 text-xs text-stone-600">
              <p>
                <span className="font-medium text-stone-500">Strongest: </span>
                {s.strongestPersona}
              </p>
              <p>
                <span className="font-medium text-stone-500">Main objection: </span>
                {s.mainObjection}
              </p>
              <p>
                <span className="font-medium text-stone-500">Best CTA: </span>
                {s.bestCTA}
              </p>
            </div>

            <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-500">
              {s.decisionTakeaway}
            </p>
          </div>
        ))}
      </div>

      {onExpandPersonas ? (
        <button
          type="button"
          onClick={onExpandPersonas}
          className="self-start text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
        >
          {personasExpanded ? "Hide persona reactions ↑" : "Expand persona reactions ↓"}
        </button>
      ) : null}
    </div>
  );
}
