"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreativeDirectorReview, CreativeDirectorRouteReview } from "@/lib/schemas/campaign";

interface CreativeDirectorReviewPanelProps {
  review: CreativeDirectorReview;
  routeNamesById: Map<string, string>;
}

const VERDICT_STYLES: Record<CreativeDirectorRouteReview["verdict"], string> = {
  keep: "bg-emerald-100 text-emerald-800",
  sharpen: "bg-amber-100 text-amber-800",
  merge: "bg-blue-100 text-blue-800",
  kill: "bg-red-100 text-red-800",
};

const GENERICITY_STYLES: Record<CreativeDirectorRouteReview["genericityRisk"], string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const SCORE_FIELDS: Array<{ key: keyof CreativeDirectorRouteReview; label: string }> = [
  { key: "originalityScore", label: "Originality" },
  { key: "ownabilityScore", label: "Ownability" },
  { key: "culturalSharpnessScore", label: "Cultural sharpness" },
  { key: "visualPotentialScore", label: "Visual potential" },
  { key: "conversionClarityScore", label: "Conversion clarity" },
];

function ScoreRow({ review }: { review: CreativeDirectorRouteReview }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
      {SCORE_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">{label}</p>
          <p className="text-sm font-semibold text-stone-950">{String(review[key])} / 5</p>
        </div>
      ))}
    </div>
  );
}

function StringList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">{title}</p>
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-stone-700">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function RouteReviewCard({ review, isStrongest }: { review: CreativeDirectorRouteReview; isStrongest: boolean }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-stone-950">{review.routeName}</h4>
          {isStrongest ? (
            <Badge className="border-stone-900 bg-stone-900 text-white">Strongest route</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={VERDICT_STYLES[review.verdict]}>{review.verdict}</Badge>
          <Badge className={GENERICITY_STYLES[review.genericityRisk]}>
            {review.genericityRisk} genericity risk
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-stone-700">{review.why}</p>

      <div className="mt-4">
        <ScoreRow review={review} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StringList title="What feels generic" items={review.whatFeelsGeneric} emptyLabel="Nothing flagged as generic." />
        <StringList title="What feels ownable" items={review.whatFeelsOwnable} emptyLabel="Nothing flagged as distinctly ownable." />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StringList title="Sharper name options" items={review.sharperNameOptions} emptyLabel="—" />
        <StringList title="Sharper killer line options" items={review.sharperKillerLines} emptyLabel="—" />
      </div>

      <div className="mt-4">
        <StringList title="Creative director notes" items={review.creativeDirectorNotes} emptyLabel="—" />
      </div>
    </div>
  );
}

export function CreativeDirectorReviewPanel({ review, routeNamesById }: CreativeDirectorReviewPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creative Director Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm leading-6 text-stone-700">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          {review.caveat}
        </p>

        <p className="text-stone-700">{review.overallVerdict}</p>

        <div className="grid gap-4">
          {review.routeReviews.map((routeReview) => (
            <RouteReviewCard
              key={routeReview.routeId}
              review={routeReview}
              isStrongest={routeReview.routeId === review.strongestRouteId}
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StringList
            title="Cross-route recommendations"
            items={review.crossRouteRecommendations}
            emptyLabel="—"
          />
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
              Routes to avoid or merge
            </p>
            {review.routesToAvoidOrMerge.length > 0 ? (
              <ul className="space-y-1.5 text-sm leading-6 text-stone-700">
                {review.routesToAvoidOrMerge.map((entry) => (
                  <li key={entry.routeId}>
                    <span className="font-medium text-stone-950">
                      {routeNamesById.get(entry.routeId) ?? entry.routeId}
                    </span>
                    {": "}
                    {entry.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">No routes flagged for avoidance or merging.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
            Final recommendation
          </p>
          <p className="text-sm leading-6 text-stone-700">{review.finalRecommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
