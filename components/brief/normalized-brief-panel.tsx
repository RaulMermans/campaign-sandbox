import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NormalizedCampaignBrief, StrategicTension } from "@/lib/schemas/campaign";

export function formatBudget(budget: NormalizedCampaignBrief["budget"]): string {
  if (!budget) return "Not specified";
  if (budget.label && /^([A-Z]{3}\s*)?0\s*[-–]\s*0$/i.test(budget.label.trim())) {
    return "Not specified";
  }
  if (budget.label) return budget.label;
  const { min, max, currency } = budget;
  if ((min == null || min === 0) && (max == null || max === 0)) return "Not specified";
  if (min != null && max != null && currency) {
    return `${currency} ${min.toLocaleString()}–${max.toLocaleString()}`;
  }
  return "Not specified";
}

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
            <Detail label="Budget" value={formatBudget(brief.budget)} />
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
