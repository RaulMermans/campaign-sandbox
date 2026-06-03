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
import { ExecutionPlanPanel } from "@/components/run/execution-plan-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CampaignExecutionPlan,
  CampaignRunOutput,
  RouteScore,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";

interface RunError {
  message: string;
  code?: string;
  stageId?: string;
}

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
  const [error, setError] = useState<RunError | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<CampaignExecutionPlan | null>(null);
  const [executionTraceEvent, setExecutionTraceEvent] = useState<TraceEvent | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setRun(null);
    setActiveStep(0);
    setSelectedRouteId(null);
    setExecutionPlan(null);
    setExecutionTraceEvent(null);
    setPlanError(null);

    const stepTimer = setInterval(() => {
      setActiveStep((s) => (s < WORKFLOW_STEPS.length - 1 ? s + 1 : s));
    }, 4000);

    try {
      const response = await fetch("/api/campaign/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brief, mode: "fast" }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const d = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
        const runError: RunError = {
          message: "error" in d ? String(d.error) : "Campaign run failed.",
        };
        if ("code" in d) runError.code = String(d.code);
        if ("stageId" in d) runError.stageId = String(d.stageId);
        setError(runError);
        return;
      }
      setRun(data as CampaignRunOutput);
    } catch {
      setError({ message: "Network error. Please try again." });
    } finally {
      clearInterval(stepTimer);
      setIsRunning(false);
    }
  }

  async function handleGeneratePlan() {
    if (!run || !selectedRouteId) return;

    setIsGeneratingPlan(true);
    setPlanError(null);
    setExecutionPlan(null);
    setExecutionTraceEvent(null);

    try {
      const response = await fetch("/api/campaign/execution-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRouteId,
          normalizedBrief: run.normalizedBrief,
          strategicTension: run.strategicTension,
          routes: run.routes,
          personas: run.personas,
          simulations: run.simulations,
          scores: run.scores,
          premortemReview: run.premortemReview,
          comparison: run.comparison,
          runId: run.runId,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Execution plan generation failed.";
        setPlanError(msg);
        return;
      }
      const result = data as { executionPlan: CampaignExecutionPlan; traceEvent: TraceEvent };
      setExecutionPlan(result.executionPlan);
      setExecutionTraceEvent(result.traceEvent);

      // Scroll to plan after short delay
      setTimeout(() => {
        document.getElementById("execution-plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setPlanError("Network error. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error.stageId ? (
                <>
                  <p className="font-medium">Run failed at stage: {error.stageId}</p>
                  <p className="mt-1">Reason: {error.message}</p>
                </>
              ) : (
                <p>{error.message}</p>
              )}
              {error.code ? (
                <p className="mt-1.5 text-xs text-red-600">Code: {error.code}</p>
              ) : null}
            </div>
          ) : null}

          {run ? (
            <CampaignRunResult
              run={run}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              onGeneratePlan={handleGeneratePlan}
              isGeneratingPlan={isGeneratingPlan}
              planError={planError}
              executionPlan={executionPlan}
              executionTraceEvent={executionTraceEvent}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

interface CampaignRunResultProps {
  run: CampaignRunOutput;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  planError: string | null;
  executionPlan: CampaignExecutionPlan | null;
  executionTraceEvent: TraceEvent | null;
}

function CampaignRunResult({
  run,
  selectedRouteId,
  onSelectRoute,
  onGeneratePlan,
  isGeneratingPlan,
  planError,
  executionPlan,
  executionTraceEvent,
}: CampaignRunResultProps) {
  const scoreRank = [...run.scores]
    .sort((a, b) => b.weightedTotal - a.weightedTotal)
    .reduce((map, s, i) => { map.set(s.routeId, i + 1); return map; }, new Map<string, number>());

  const scoreLabels = deriveScoreLabels(run.scores);
  const recommendedRouteId = run.comparison.recommendedRouteId;

  const allTraceEvents = executionTraceEvent
    ? [...run.traceEvents, executionTraceEvent]
    : run.traceEvents;

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
            <p className="text-stone-600">
              Review the comparison and select the route you want to develop into an execution plan.
              The system recommendation is guidance only — your judgment takes precedence.
            </p>

            {/* Route selection buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
              {run.routes.map((route) => {
                const isSelected = selectedRouteId === route.id;
                const isRecommended = recommendedRouteId === route.id;

                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => onSelectRoute(route.id)}
                    className={[
                      "rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:text-stone-950",
                    ].join(" ")}
                  >
                    {route.name}
                    {isRecommended ? (
                      <span className={[
                        "ml-2 rounded-full px-1.5 py-0.5 text-xs",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-stone-100 text-stone-500",
                      ].join(" ")}>
                        recommended
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Confirmation and generate button */}
            {selectedRouteId ? (
              <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-700">
                  <span className="font-semibold">Selected route:</span>{" "}
                  {run.routes.find((r) => r.id === selectedRouteId)?.name ?? selectedRouteId}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Generating the execution plan is server-side. You can change your selection at any time before generating.
                </p>
                <button
                  type="button"
                  onClick={onGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="mt-3 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {isGeneratingPlan ? "Generating execution plan…" : "Generate execution plan"}
                </button>
              </div>
            ) : null}

            {planError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {planError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Execution plan section */}
      <section id="execution-plan">
        {executionPlan ? (
          <Card>
            <CardHeader>
              <CardTitle>Execution Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionPlanPanel plan={executionPlan} />
            </CardContent>
          </Card>
        ) : isGeneratingPlan ? (
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-400">
            Generating execution plan for{" "}
            <span className="font-medium text-stone-700">
              {run.routes.find((r) => r.id === selectedRouteId)?.name ?? selectedRouteId}
            </span>
            …
          </div>
        ) : null}
      </section>

      <CollapsibleSection
        id="trace"
        title="Trace Timeline"
        preview={`${allTraceEvents.length} stage events recorded.`}
      >
        <div className="p-1">
          <TraceTimeline events={allTraceEvents} />
        </div>
      </CollapsibleSection>
    </section>
  );
}
