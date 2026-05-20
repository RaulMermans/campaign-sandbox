import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouteComparisonMatrix } from "@/lib/schemas/campaign";

export function RouteComparisonTable({ matrix }: { matrix: RouteComparisonMatrix }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Matrix</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.12em] text-stone-500">
              <th className="py-3 pr-4">Route</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Strengths</th>
              <th className="py-3 pr-4">Tradeoffs</th>
              <th className="py-3">Best for</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.routeId} className="border-b border-stone-100 align-top">
                <td className="py-4 pr-4 font-medium text-stone-950">{row.routeName}</td>
                <td className="py-4 pr-4 capitalize text-stone-700">{row.strategicRole}</td>
                <td className="py-4 pr-4 text-stone-950">{row.totalScore.toFixed(1)}</td>
                <td className="py-4 pr-4 text-stone-700">{row.strengths.join(", ")}</td>
                <td className="py-4 pr-4 text-stone-700">{row.tradeoffs.join(", ")}</td>
                <td className="py-4 text-stone-700">{row.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm leading-6 text-stone-700">{matrix.recommendation}</p>
      </CardContent>
    </Card>
  );
}
