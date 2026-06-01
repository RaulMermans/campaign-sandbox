"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CampaignRoute, RouteComparisonMatrix, PremortemReview } from "@/lib/schemas/campaign";

interface ExecutiveSummaryPanelProps {
  routes: CampaignRoute[];
  comparison: RouteComparisonMatrix;
  premortemReview: PremortemReview;
}

const ROLE_COLORS: Record<string, string> = {
  safest: "bg-green-100 text-green-800",
  boldest: "bg-purple-100 text-purple-800",
  conversion: "bg-blue-100 text-blue-800",
};

export function ExecutiveSummaryPanel({ routes, comparison, premortemReview }: ExecutiveSummaryPanelProps) {
  const recommendedRow = comparison.rows.find((r) => r.routeId === comparison.recommendedRouteId);
  const recommendedRoute = routes.find((r) => r.id === comparison.recommendedRouteId);

  if (!recommendedRow || !recommendedRoute) return null;

  const routeRisk = premortemReview.routeRisks.find((rr) => rr.routeId === comparison.recommendedRouteId);
  const primaryRisk = routeRisk?.risks[0] ?? premortemReview.overallRisks[0] ?? null;

  const whyItLeads = [
    recommendedRow.keyStrengths[0],
    recommendedRow.keyStrengths[1] ?? null,
    recommendedRow.recommendation,
  ].filter(Boolean) as string[];

  return (
    <Card className="border-stone-300 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold uppercase tracking-[0.12em] text-stone-500">
            Recommended Route
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-stone-950">{recommendedRoute.name}</h2>
          <Badge className={ROLE_COLORS[recommendedRow.strategicRole] ?? ""}>
            {recommendedRow.strategicRole}
          </Badge>
          <span className="rounded bg-stone-100 px-2 py-1 text-sm font-semibold text-stone-700">
            {recommendedRow.weightedTotal.toFixed(1)} / 5
          </span>
        </div>

        <p className="text-sm leading-6 text-stone-700">{recommendedRoute.keyMessage}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">Why it leads</p>
            <ul className="grid gap-1 text-sm text-stone-700">
              {whyItLeads.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {primaryRisk ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">Watch out</p>
              <div className="flex gap-2 text-sm text-stone-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {primaryRisk}
              </div>
            </div>
          ) : null}
        </div>

        {comparison.decisionNotes.length > 0 ? (
          <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">Decision note</p>
            <p className="text-xs leading-5 text-stone-500">{comparison.decisionNotes[0]}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
