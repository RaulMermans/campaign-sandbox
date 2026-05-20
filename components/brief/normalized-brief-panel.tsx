import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NormalizedCampaignBrief, StrategicTension } from "@/lib/schemas/campaign";

export function NormalizedBriefPanel({
  brief,
  tension,
}: {
  brief: NormalizedCampaignBrief;
  tension: StrategicTension;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Normalized Brief</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
          <p className="text-lg font-medium text-stone-950">{brief.brandName}: {brief.capsuleDescription}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Audience" value={`${brief.audience.ageRange}: ${brief.audience.segments.join(", ")}`} />
            <Detail label="Markets" value={brief.audience.geographies.join(", ")} />
            <Detail label="Budget" value={`${brief.budget.currency} ${brief.budget.min.toLocaleString()}-${brief.budget.max.toLocaleString()}`} />
            <Detail label="Launch" value={brief.timeline.launchWindow} />
          </div>
          <Detail label="Constraints" value={brief.constraints.join("; ")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Strategic Tension</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
          <p className="text-base font-medium text-stone-950">{tension.coreTension}</p>
          <Detail label="Opportunity" value={tension.creativeOpportunity} />
          <Detail label="Avoid" value={tension.avoid.join(", ")} />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p>{value}</p>
    </div>
  );
}
