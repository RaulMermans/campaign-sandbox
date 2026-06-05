"use client";

import { SectionNav } from "@/components/run/section-nav";
import { RunMetadataPanel } from "@/components/run/run-metadata-panel";
import { ExecutiveSummaryPanel } from "@/components/run/executive-summary-panel";
import { NormalizedBriefPanel } from "@/components/brief/normalized-brief-panel";
import { CampaignRouteCard } from "@/components/routes/campaign-route-card";
import { RouteComparisonTable } from "@/components/routes/route-comparison-table";
import { PersonaSimulationPanel } from "@/components/simulation/persona-simulation-panel";
import { CollapsibleSection } from "@/components/run/collapsible-section";
import { ExecutionPlanPanel } from "@/components/run/execution-plan-panel";
import { ExportPanel } from "@/components/run/export-panel";
import { TraceTimeline } from "@/components/trace/trace-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CampaignExecutionPlan,
  CampaignExportInput,
  CampaignRunOutput,
  RouteScore,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";

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

interface ResultsWorkspaceProps {
  run: CampaignRunOutput;
  isRunning: boolean;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  planError: string | null;
  executionPlan: CampaignExecutionPlan | null;
  executionTraceEvent: TraceEvent | null;
}

export function ResultsWorkspace({
  run,
  isRunning,
  selectedRouteId,
  onSelectRoute,
  onGeneratePlan,
  isGeneratingPlan,
  planError,
  executionPlan,
  executionTraceEvent,
}: ResultsWorkspaceProps) {
  const scoreRank = [...run.scores]
    .sort((a, b) => b.weightedTotal - a.weightedTotal)
    .reduce((map, s, i) => {
      map.set(s.routeId, i + 1);
      return map;
    }, new Map<string, number>());

  const scoreLabels = deriveScoreLabels(run.scores);
  const recommendedRouteId = run.comparison.recommendedRouteId;

  const allTraceEvents = executionTraceEvent
    ? [...run.traceEvents, executionTraceEvent]
    : run.traceEvents;

  const exportInput: Omit<CampaignExportInput, "format"> | null = executionPlan
    ? {
        runId: run.runId,
        normalizedBrief: run.normalizedBrief,
        strategicTension: run.strategicTension,
        routes: run.routes,
        personas: run.personas,
        simulations: run.simulations,
        scores: run.scores,
        premortemReview: run.premortemReview,
        comparison: run.comparison,
        selectedRouteId: selectedRouteId ?? undefined,
        executionPlan,
        traceEvents: allTraceEvents,
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 md:px-8">
      {isRunning ? (
        <div className="mb-4 rounded-lg border border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
          Workflow running…
        </div>
      ) : null}

      <div className="grid gap-4">
        <SectionNav />

        <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500">
          Synthetic persona reactions and route scores are strategic estimates for decision support only.
          They are not real market research or success predictions.
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
            <PersonaSimulationPanel
              personas={run.personas}
              simulations={run.simulations}
              routes={run.routes}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="risks"
          title="Pre-mortem Risk Review"
          preview={run.premortemReview.summary}
        >
          <div className="p-5">
            <p className="mb-4 text-sm font-medium text-stone-950">
              {run.premortemReview.summary}
            </p>

            {run.premortemReview.topFailureRisks.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
                  Top failure risks
                </p>
                <div className="grid gap-3">
                  {run.premortemReview.topFailureRisks.slice(0, 3).map((tfr) => (
                    <div
                      key={tfr.risk}
                      className="rounded-md border border-amber-200 bg-amber-50/50 p-4"
                    >
                      <p className="text-sm font-semibold text-stone-900">{tfr.risk}</p>
                      <p className="mt-1 text-xs text-stone-600">{tfr.whyItHappens}</p>
                      <div className="mt-2 grid gap-1 text-xs text-stone-500">
                        <p>
                          <span className="font-medium text-stone-600">Early warning:</span>{" "}
                          {tfr.earlyWarningSign}
                        </p>
                        <p>
                          <span className="font-medium text-stone-600">Mitigation:</span>{" "}
                          {tfr.mitigation}
                        </p>
                        <p>
                          <span className="font-medium text-stone-600">Team:</span>{" "}
                          {tfr.affectedTeam}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              {run.premortemReview.routeRisks.map((routeRisk) => (
                <div
                  key={routeRisk.routeId}
                  className="rounded-md border border-stone-200 p-4 text-sm leading-6 text-stone-700"
                >
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

            {run.premortemReview.overallRisks.length > 0 ? (
              <div className="mt-4 rounded-md bg-stone-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
                  Overall risks
                </p>
                <ul className="grid gap-1 text-sm text-stone-700">
                  {run.premortemReview.overallRisks.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
                Review the comparison and select the route to develop into an execution plan.
                The system recommendation is guidance only — your judgment takes precedence.
              </p>
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
                        <span
                          className={[
                            "ml-2 rounded-full px-1.5 py-0.5 text-xs",
                            isSelected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500",
                          ].join(" ")}
                        >
                          recommended
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedRouteId ? (
                <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm text-stone-700">
                    <span className="font-semibold">Selected route:</span>{" "}
                    {run.routes.find((r) => r.id === selectedRouteId)?.name ?? selectedRouteId}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    You can change your selection before generating.
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

        <section id="export">
          {exportInput ? (
            <ExportPanel exportInput={exportInput} />
          ) : (
            <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-400">
              Export is available after the execution plan is generated.
            </div>
          )}
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
      </div>
    </div>
  );
}
