"use client";

import { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);

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
        <p className="font-medium text-stone-950">{route.killerLine}</p>
        <p>{route.concept}</p>

        {/* Compact always-visible fields */}
        <div className="grid gap-2">
          <MiniDetail label="Enemy" value={route.enemy} />
          <MiniDetail label="Proof" value={route.proofMechanism} />
        </div>

        {/* Expandable production DNA */}
        {expanded && (
          <div className="grid gap-3 border-t border-stone-100 pt-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Visual world</p>
              <ul className="grid gap-1">
                {route.visualWorld.map((v) => (
                  <li key={v} className="flex gap-2 text-sm text-stone-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Channel fit</p>
              <ul className="grid gap-1">
                {route.channelFit.map((c) => (
                  <li key={c} className="flex gap-2 text-sm text-stone-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700 mb-1">Failure mode</p>
              <p className="text-sm text-stone-700">{route.failureMode}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Sample copy</p>
              <ul className="grid gap-1">
                {route.sampleCopy.map((copy) => (
                  <li key={copy}>
                    <q className="text-sm text-stone-700">{copy}</q>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-stone-400 hover:text-stone-700 text-left"
        >
          {expanded ? "Show less" : "Show visual world, channels, failure mode"}
        </button>

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

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">{label}: </span>
      <span className="text-sm text-stone-700">{value}</span>
    </div>
  );
}
