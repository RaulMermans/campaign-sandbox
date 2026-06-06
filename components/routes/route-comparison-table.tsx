"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouteComparisonMatrix, RouteComparisonRow } from "@/lib/schemas/campaign";
import type { RouteRiskTaxonomy } from "@/lib/workflow/derive-risk-taxonomy";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const ROLE_COLORS: Record<string, string> = {
  safest: "bg-green-100 text-green-800",
  boldest: "bg-purple-100 text-purple-800",
  conversion: "bg-blue-100 text-blue-800",
};

function deriveRowBadges(
  row: RouteComparisonRow,
  allRows: RouteComparisonRow[],
  recommendedRouteId: string,
): string[] {
  const badges: string[] = [];
  if (row.routeId === recommendedRouteId) badges.push("Recommended");

  const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const minRisk = allRows.reduce((min, r) =>
    riskOrder[r.riskLevel] < riskOrder[min.riskLevel] ? r : min, allRows[0]);
  if (minRisk && row.routeId === minRisk.routeId && row.riskLevel === "low") badges.push("Safest");

  const maxBold = allRows.reduce((max, r) =>
    r.audienceResonance > max.audienceResonance ? r : max, allRows[0]);
  if (maxBold && row.routeId === maxBold.routeId && row.strategicRole === "boldest") badges.push("Boldest");

  const maxConv = allRows.reduce((max, r) =>
    r.conversionPotential > max.conversionPotential ? r : max, allRows[0]);
  if (maxConv && row.routeId === maxConv.routeId && !badges.includes("Recommended")) badges.push("Top Conversion");

  return badges;
}

const RISK_TYPE_COLORS: Record<string, string> = {
  "Creative risk": "bg-purple-100 text-purple-700",
  "Proof risk": "bg-red-100 text-red-700",
  "Conversion risk": "bg-blue-100 text-blue-700",
  "Channel risk": "bg-orange-100 text-orange-700",
  "Execution risk": "bg-amber-100 text-amber-700",
  "Brand dilution risk": "bg-stone-200 text-stone-600",
};

const SEVERITY_COLORS: Record<string, string> = {
  Low: "text-green-700",
  Moderate: "text-amber-700",
  High: "text-red-700",
};

export function RouteComparisonTable({
  matrix,
  riskTaxonomy = [],
}: {
  matrix: RouteComparisonMatrix;
  riskTaxonomy?: RouteRiskTaxonomy[];
}) {
  const sorted = [...matrix.rows].sort((a, b) => b.weightedTotal - a.weightedTotal);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(routeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Matrix</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.12em] text-stone-400">
                <th className="w-6 py-3 pr-3">#</th>
                <th className="py-3 pr-4">Route</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4 text-right">Score</th>
                <th className="py-3 pr-4 text-right">Resonance</th>
                <th className="py-3 pr-4 text-right">Conversion</th>
                <th className="py-3 pr-4 text-right">Feasibility</th>
                <th className="py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const badges = deriveRowBadges(row, matrix.rows, matrix.recommendedRouteId);
                const isRecommended = row.routeId === matrix.recommendedRouteId;
                const isExpanded = expandedIds.has(row.routeId);
                const rowBg = isRecommended ? " bg-stone-50" : "";
                const taxonomy = riskTaxonomy.find((t) => t.routeId === row.routeId);

                return [
                  <tr key={`${row.routeId}-main`} className={`border-b border-stone-100 align-middle${rowBg}`}>
                    <td className="py-3 pr-3 text-sm font-medium text-stone-400">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-stone-950">{row.routeName}</span>
                        {badges.map((b) => (
                          <span
                            key={b}
                            className="rounded bg-stone-200 px-1.5 py-0.5 text-xs font-semibold text-stone-700"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={ROLE_COLORS[row.strategicRole] ?? ""}>{row.strategicRole}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-stone-950">
                      {row.weightedTotal.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4 text-right text-stone-700">{row.audienceResonance.toFixed(1)}</td>
                    <td className="py-3 pr-4 text-right text-stone-700">{row.conversionPotential.toFixed(1)}</td>
                    <td className="py-3 pr-4 text-right text-stone-700">{row.feasibility.toFixed(1)}</td>
                    <td className="py-3">
                      {taxonomy ? (
                        <div className="grid gap-1">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${RISK_TYPE_COLORS[taxonomy.primaryRiskType] ?? ""}`}>
                            {taxonomy.primaryRiskType}
                          </span>
                          <span className={`text-xs font-medium ${SEVERITY_COLORS[taxonomy.severity] ?? ""}`}>
                            {taxonomy.severity}
                          </span>
                        </div>
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${RISK_COLORS[row.riskLevel] ?? ""}`}>
                          {row.riskLevel} risk
                        </span>
                      )}
                    </td>
                  </tr>,

                  isExpanded && (
                    <tr key={`${row.routeId}-detail`} className={rowBg}>
                      <td />
                      <td colSpan={7} className="pb-4 pr-4">
                        <div className="grid gap-3 pt-2 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
                              Key strengths
                            </p>
                            <ul className="grid gap-1 text-sm text-stone-700">
                              {row.keyStrengths.map((s) => (
                                <li key={s} className="flex gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
                              Key risks
                            </p>
                            <ul className="grid gap-1 text-sm text-stone-700">
                              {row.keyRisks.map((r) => (
                                <li key={r} className="flex gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {row.recommendation && (
                            <p className="col-span-full text-xs text-stone-500">
                              <span className="font-medium">When to use: </span>
                              {row.recommendation}
                            </p>
                          )}
                          {taxonomy && (
                            <p className="col-span-full text-xs italic text-stone-400">
                              <span className="not-italic font-medium">Risk note: </span>
                              {taxonomy.explanation}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),

                  <tr key={`${row.routeId}-toggle`} className={rowBg}>
                    <td colSpan={8} className="pb-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.routeId)}
                        className="text-xs text-stone-400 hover:text-stone-700"
                      >
                        {isExpanded ? "Hide details ↑" : "Show details ↓"}
                      </button>
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm leading-6 text-stone-700">{matrix.summary}</p>
          <ul className="mt-2 grid gap-1">
            {matrix.decisionNotes.map((note) => (
              <li key={note} className="flex gap-2 text-xs text-stone-500">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
