"use client";

import { useState } from "react";
import { MessyBriefInput } from "@/components/brief/messy-brief-input";
import { NormalizedBriefPanel } from "@/components/brief/normalized-brief-panel";
import { CampaignRouteCard } from "@/components/routes/campaign-route-card";
import { RouteComparisonTable } from "@/components/routes/route-comparison-table";
import { PersonaSimulationPanel } from "@/components/simulation/persona-simulation-panel";
import { TraceTimeline } from "@/components/trace/trace-timeline";
import { ExecutiveSummaryPanel } from "@/components/run/executive-summary-panel";
import { RunMetadataPanel } from "@/components/run/run-metadata-panel";
import { SectionNav } from "@/components/run/section-nav";
import { CollapsibleSection } from "@/components/run/collapsible-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRunOutput, RouteScore } from "@/lib/schemas/campaign";
import { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";

const WORKFLOW_STEPS = [
  "Normalizing brief",
  "Extracting strategic tension",
  "Generating routes",
  "Building personas",
  "Simulating reactions",
  "Scoring routes",
  "Reviewing risks",
  "Comparing routes",
];

function deriveScoreLabels(scores: RouteScore[]): Map<string, string> {
  const labels = new Map<string, string>();
  if (scores.length === 0) return labels;

  const sorted = [...scores].sort((a, b) => b.weightedTotal - a.weightedTotal);
  labels.set(sorted[0].routeId, "Strongest overall");

  const topResonance = [...scores].sort(
    (a, b) => b.scores.culturalRelevance - a.scores.culturalRelevance,
  )[0];
  if (topResonance && !labels.has(topResonance.routeId)) {
    labels.set(topResonance.routeId, "Best resonance");
  }

  const topConversion = [...scores].sort(
    (a, b) => b.scores.conversionPotential - a.scores.conversionPotential,
  )[0];
  if (topConversion && !labels.has(topConversion.routeId)) {
    labels.set(topConversion.routeId, "Best conversion");
  }

  const topFeasibility = [...scores].sort(
    (a, b) => b.scores.feasibility - a.scores.feasibility,
  )[0];
  if (topFeasibility && !labels.has(topFeasibility.routeId)) {
    labels.set(topFeasibility.routeId, "Lowest risk");
  }

  return labels;
}

export default function Home() {
  const [brief, setBrief] = useState("");
  const [run, setRun] = useState<CampaignRunOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setRun(null);
    setActiveStep(0);

    const stepTimer = setInterval(() => {
      setActiveStep((s) => (s < WORKFLOW_STEPS.length - 1 ? s + 1 : s));
    }, 4000);

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
      clearInterval(stepTimer);
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

          {isRunning ? (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Running campaign workflow
              </p>
              <ol className="grid gap-2">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2.5 text-sm ${
                      idx === activeStep
                        ? "font-semibold text-stone-950"
                        : idx < activeStep
                          ? "text-stone-400"
                          : "text-stone-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        idx === activeStep
                          ? "bg-stone-950"
                          : idx < activeStep
                            ? "bg-stone-300"
                            : "bg-stone-200"
                      }`}
                    />
                    {idx + 1}. {step}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-stone-400">
                Estimated progress — not real-time server streaming.
              </p>
            </div>
          ) : null}

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
  const scoreRank = [...run.scores]
    .sort((a, b) => b.weightedTotal - a.weightedTotal)
    .reduce((map, s, i) => { map.set(s.routeId, i + 1); return map; }, new Map<string, number>());

  const scoreLabels = deriveScoreLabels(run.scores);

  return (
    <section className="grid gap-4">
      <SectionNav />

      <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500">
        Synthetic persona reactions and route scores are strategic estimates for decision support only. They are not
        real market research or success predictions.
      </p>

      <RunMetadataPanel
        traceEvents={run.traceEvents}
        routes={run.routes}
        personas={run.personas}
        simulations={run.simulations}
        comparison={run.comparison}
      />

      <section id="summary">
        <ExecutiveSummaryPanel
          routes={run.routes}
          comparison={run.comparison}
          premortemReview={run.premortemReview}
        />
      </section>

      <section id="brief">
        <NormalizedBriefPanel brief={run.normalizedBrief} tension={run.strategicTension} />
      </section>

      <section id="routes">
        <div className="grid gap-4 lg:grid-cols-3">
          {run.routes.map((route) => (
            <CampaignRouteCard
              key={route.id}
              route={route}
              score={run.scores.find((s) => s.routeId === route.id)}
              rank={scoreRank.get(route.id)}
              scoreLabel={scoreLabels.get(route.id)}
            />
          ))}
        </div>
      </section>

      <CollapsibleSection
        id="simulations"
        title={`Audience Simulations (${run.simulations.length})`}
        preview={`${run.personas.length} synthetic personas × ${run.routes.length} routes. Expand to review individual reactions.`}
      >
        <div className="p-1">
          <PersonaSimulationPanel personas={run.personas} simulations={run.simulations} routes={run.routes} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="risks"
        title="Pre-mortem Risk Review"
        preview={run.premortemReview.summary}
      >
        <div className="p-5">
          <p className="mb-4 font-medium text-stone-950 text-sm">{run.premortemReview.summary}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {run.premortemReview.routeRisks.map((routeRisk) => (
              <div key={routeRisk.routeId} className="rounded-md border border-stone-200 p-4 text-sm leading-6 text-stone-700">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                  {run.routes.find((r) => r.id === routeRisk.routeId)?.name ?? routeRisk.routeId}
                </p>
                <ul className="mt-2 grid gap-1">
                  {routeRisk.risks.map((risk) => (
                    <li key={risk} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                      {risk}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-400">
                  Mitigation: {routeRisk.mitigations.join("; ")}
                </p>
              </div>
            ))}
          </div>
          {run.premortemReview.overallRisks.length > 0 && (
            <div className="mt-4 rounded-md bg-stone-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1">Overall risks</p>
              <ul className="grid gap-1 text-sm text-stone-700">
                {run.premortemReview.overallRisks.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <section id="comparison">
        <RouteComparisonTable matrix={run.comparison} />
      </section>

      <section id="selection">
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
                  className="cursor-not-allowed rounded-md border border-stone-300 bg-white px-3 py-2 font-medium text-stone-400"
                >
                  Select {route.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <CollapsibleSection
        id="trace"
        title="Trace Timeline"
        preview={`${run.traceEvents.length} stage events recorded.`}
      >
        <div className="p-1">
          <TraceTimeline events={run.traceEvents} />
        </div>
      </CollapsibleSection>
    </section>
  );
}
