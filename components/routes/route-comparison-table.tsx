import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouteComparisonMatrix } from "@/lib/schemas/campaign";

const RISK_BADGE: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function RouteComparisonTable({ matrix }: { matrix: RouteComparisonMatrix }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Matrix</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.12em] text-stone-500">
                <th className="py-3 pr-4">Route</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Resonance</th>
                <th className="py-3 pr-4">Conversion</th>
                <th className="py-3 pr-4">Feasibility</th>
                <th className="py-3 pr-4">Risk</th>
                <th className="py-3">When to use</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr
                  key={row.routeId}
                  className={`border-b border-stone-100 align-top${row.routeId === matrix.recommendedRouteId ? " bg-stone-50" : ""}`}
                >
                  <td className="py-4 pr-4 font-medium text-stone-950">
                    {row.routeName}
                    {row.routeId === matrix.recommendedRouteId && (
                      <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-xs font-semibold text-stone-700">
                        Recommended
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4 capitalize text-stone-700">{row.strategicRole}</td>
                  <td className="py-4 pr-4 text-stone-950">{row.weightedTotal.toFixed(1)}</td>
                  <td className="py-4 pr-4 text-stone-950">{row.audienceResonance.toFixed(1)}</td>
                  <td className="py-4 pr-4 text-stone-950">{row.conversionPotential.toFixed(1)}</td>
                  <td className="py-4 pr-4 text-stone-950">{row.feasibility.toFixed(1)}</td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${RISK_BADGE[row.riskLevel] ?? ""}`}
                    >
                      {row.riskLevel}
                    </span>
                  </td>
                  <td className="py-4 text-stone-700">{row.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {matrix.rows.map((row) => (
          <div key={row.routeId} className="grid gap-2 rounded-md border border-stone-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{row.routeName}</p>
            <div className="grid gap-1 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-stone-700">Key strengths</p>
                <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
                  {row.keyStrengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-700">Key risks</p>
                <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
                  {row.keyRisks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        <div className="grid gap-2 rounded-md bg-stone-50 p-4">
          <p className="text-sm leading-6 text-stone-700">{matrix.summary}</p>
          <ul className="mt-1 list-inside list-disc text-xs text-stone-500">
            {matrix.decisionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
