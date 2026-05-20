import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRoute, RouteScore } from "@/lib/schemas/campaign";

export function CampaignRouteCard({ route, score }: { route: CampaignRoute; score?: RouteScore }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{route.name}</CardTitle>
          <Badge>{route.strategicRole}</Badge>
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
              <li key={copy}>"{copy}"</li>
            ))}
          </ul>
        </div>
        {score ? (
          <div className="mt-auto rounded-md bg-stone-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Strategic estimate</p>
            <p className="text-2xl font-semibold text-stone-950">{score.weightedTotal.toFixed(1)} / 5</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
