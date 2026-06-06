"use client";

import { Badge } from "@/components/ui/badge";
import type { DecisionSummary, RiskType } from "@/lib/workflow/build-decision-summary";

interface DecisionCockpitProps {
  summary: DecisionSummary;
  selectedRouteId: string | null;
  exportReady: boolean;
}

const RISK_COLORS: Record<RiskType, string> = {
  "Creative risk": "bg-purple-100 text-purple-800",
  "Proof risk": "bg-red-100 text-red-800",
  "Conversion risk": "bg-blue-100 text-blue-800",
  "Channel risk": "bg-orange-100 text-orange-800",
  "Execution risk": "bg-amber-100 text-amber-800",
  "Brand dilution risk": "bg-stone-200 text-stone-700",
};

export function DecisionCockpit({ summary, selectedRouteId, exportReady }: DecisionCockpitProps) {
  return (
    <div className="workspace-compact rounded-lg border border-stone-300 bg-white">
      <div className="border-b border-stone-100 px-5 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
          Decision Cockpit
        </p>
      </div>

      <div className="grid gap-0 divide-y divide-stone-100">
        {/* Recommended route */}
        <div className="px-5 py-4">
          <p className="mb-1 text-xs font-medium text-stone-400">Recommended route</p>
          <p className="text-base font-semibold text-stone-950">{summary.recommendedRouteName}</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">{summary.whyItWins}</p>
        </div>

        {/* Runner-up + tradeoff */}
        {summary.runnerUpStrength ? (
          <div className="px-5 py-4">
            <p className="mb-1 text-xs font-medium text-stone-400">Runner-up strength</p>
            <p className="text-sm leading-5 text-stone-700">{summary.runnerUpStrength}</p>
          </div>
        ) : null}

        <div className="px-5 py-4">
          <p className="mb-1 text-xs font-medium text-stone-400">Biggest tradeoff</p>
          <p className="text-sm leading-5 text-stone-700">{summary.biggestTradeoff}</p>
        </div>

        {/* Risk type */}
        <div className="flex items-center gap-3 px-5 py-4">
          <p className="text-xs font-medium text-stone-400">Primary risk</p>
          <Badge className={RISK_COLORS[summary.riskType] ?? "bg-stone-100 text-stone-700"}>
            {summary.riskType}
          </Badge>
        </div>

        {/* Close score notice */}
        {summary.closeScoreNotice ? (
          <div className="bg-stone-50 px-5 py-3.5">
            <p className="text-xs leading-5 text-stone-500">{summary.closeScoreNotice}</p>
          </div>
        ) : null}

        {/* Selected + export status */}
        <div className="flex flex-wrap gap-4 px-5 py-4">
          <div>
            <p className="mb-1 text-xs font-medium text-stone-400">Selection</p>
            <p className="text-sm text-stone-700">
              {selectedRouteId ? (
                <span className="font-medium text-stone-950">Route selected</span>
              ) : (
                <span className="text-stone-400">No route selected yet</span>
              )}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-stone-400">Export</p>
            <p className="text-sm text-stone-700">
              {exportReady ? (
                <span className="font-medium text-green-700">Ready</span>
              ) : (
                <span className="text-stone-400">Generate execution plan first</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
