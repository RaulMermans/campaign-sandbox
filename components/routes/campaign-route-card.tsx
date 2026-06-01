import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRoute, RouteScore } from "@/lib/schemas/campaign";

const ROLE_COLORS: Record<string, string> = {
  safest: "bg-green-100 text-green-800",
  boldest: "bg-purple-100 text-purple-800",
  conversion: "bg-blue-100 text-blue-800",
};

export function CampaignRouteCard({
  route,
  score,
  rank,
  scoreLabel,
}: {
  route: CampaignRoute;
  score?: RouteScore;
  rank?: number;
  scoreLabel?: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                {rank}
              </span>
            )}
            <CardTitle className="text-base">{route.name}</CardTitle>
          </div>
          <Badge className={ROLE_COLORS[route.strategicRole] ?? ""}>{route.strategicRole}</Badge>
        </div>
        <p className="text-sm leading-6 text-stone-600">{route.position}</p>
      </CardHeader>
      <CardContent className="grid flex-1 gap-4 text-sm leading-6 text-stone-700">
        <p className="font-medium text-stone-950">{route.keyMessage}</p>
        <p>{route.concept}</p>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Sample copy</p>
          <ul className="grid gap-1">
            {route.sampleCopy.map((copy) => (
              <li key={copy}>
                <q>{copy}</q>
              </li>
            ))}
          </ul>
        </div>
        {score ? (
          <div className="mt-auto rounded-md bg-stone-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Strategic estimate</p>
            <p className="text-2xl font-semibold text-stone-950">{score.weightedTotal.toFixed(1)} / 5</p>
            {scoreLabel ? (
              <p className="mt-0.5 text-xs text-stone-500">{scoreLabel}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
