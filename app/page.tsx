"use client";

import { useState } from "react";
import { MessyBriefInput } from "@/components/brief/messy-brief-input";
import { NormalizedBriefPanel } from "@/components/brief/normalized-brief-panel";
import { CampaignRouteCard } from "@/components/routes/campaign-route-card";
import { RouteComparisonTable } from "@/components/routes/route-comparison-table";
import { PersonaSimulationPanel } from "@/components/simulation/persona-simulation-panel";
import { TraceTimeline } from "@/components/trace/trace-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRunOutput } from "@/lib/schemas/campaign";
import { NODO_SAMPLE_BRIEF } from "@/lib/workflow/mock-campaign-run";

export default function Home() {
  const [brief, setBrief] = useState("");
  const [run, setRun] = useState<CampaignRunOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/campaign/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brief }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Campaign run failed.";
        setError(msg);
        return;
      }
      setRun(data as CampaignRunOutput);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-14">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Creative strategy workspace
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-none text-stone-950 md:text-7xl">
            Campaign Sandbox
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-stone-700">
            Normalize a messy brief, generate strategic routes, simulate synthetic audience reactions, and compare
            tradeoffs before committing to a plan.
          </p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600">
            Runs execute server-side through the campaign workflow. LLM-backed stages use the configured provider;
            scoring and comparison are deterministic. Synthetic persona reactions are planning hypotheses, not market
            research or success predictions.
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="border-stone-300">
            <CardHeader>
              <CardTitle>Messy Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <MessyBriefInput
                value={brief}
                onChange={setBrief}
                onRun={handleRun}
                onUseSample={() => setBrief(NODO_SAMPLE_BRIEF)}
                isRunning={isRunning}
              />
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
          ) : null}

          {run ? <CampaignRunResult run={run} /> : null}
        </div>
      </section>
    </main>
  );
}

function CampaignRunResult({ run }: { run: CampaignRunOutput }) {
  return (
    <section className="grid gap-6">
      <p className="rounded-lg border border-stone-300 bg-white p-4 text-sm leading-6 text-stone-700">
        Synthetic persona reactions and route scores are strategic estimates for decision support only. They are not
        real market research or success predictions.
      </p>
      <NormalizedBriefPanel brief={run.normalizedBrief} tension={run.strategicTension} />
      <div className="grid gap-4 lg:grid-cols-3">
        {run.routes.map((route) => (
          <CampaignRouteCard
            key={route.id}
            route={route}
            score={run.scores.find((score) => score.routeId === route.id)}
          />
        ))}
      </div>
      <PersonaSimulationPanel personas={run.personas} simulations={run.simulations} routes={run.routes} />
      <Card>
        <CardHeader>
          <CardTitle>Pre-mortem Risk Review</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
          <p className="font-medium text-stone-950">{run.premortemReview.summary}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {run.premortemReview.routeRisks.map((routeRisk) => (
              <div key={routeRisk.routeId} className="rounded-md border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                  {routeRisk.routeId}
                </p>
                <p className="mt-2">{routeRisk.risks.join("; ")}</p>
                <p className="mt-2 text-stone-500">Mitigation: {routeRisk.mitigations.join("; ")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <RouteComparisonTable matrix={run.comparison} />
      <Card>
        <CardHeader>
          <CardTitle>Human Route Selection</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-stone-700">
          <p>
            Human selection and execution plan generation are not yet implemented in this sprint. Select a route and
            generate a plan in a future release.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {run.routes.map((route) => (
              <button
                key={route.id}
                type="button"
                disabled
                className="rounded-md border border-stone-300 bg-white px-3 py-2 font-medium text-stone-400 cursor-not-allowed"
              >
                Select {route.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <TraceTimeline events={run.traceEvents} />
    </section>
  );
}

