"use client";

import { useState } from "react";
import { MessyBriefInput } from "@/components/brief/messy-brief-input";
import { NormalizedBriefPanel } from "@/components/brief/normalized-brief-panel";
import { CampaignRouteCard } from "@/components/routes/campaign-route-card";
import { RouteComparisonTable } from "@/components/routes/route-comparison-table";
import { PersonaSimulationPanel } from "@/components/simulation/persona-simulation-panel";
import { TraceTimeline } from "@/components/trace/trace-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRun } from "@/lib/schemas/workflow";
import { buildMockCompletedCampaignRun, NODO_SAMPLE_BRIEF } from "@/lib/workflow/mock-campaign-run";
import { runCampaignWorkflow } from "@/lib/workflow/run-campaign-workflow";

export default function Home() {
  const [brief, setBrief] = useState("");
  const [run, setRun] = useState<CampaignRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function handleRun() {
    setIsRunning(true);
    const result = await runCampaignWorkflow(brief);
    setRun(result);
    setIsRunning(false);
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
            Demo mode uses mocked strategy outputs. Real brief normalization can be enabled server-side via{" "}
            <code className="rounded bg-stone-200 px-1 py-0.5 font-mono text-xs">
              CAMPAIGN_SANDBOX_LLM_PROVIDER=openai
            </code>
            . Later workflow stages remain mocked.
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

          {run ? (
            <CampaignRunResult
              run={run}
              onSelectRoute={(routeId) => setRun(buildMockCompletedCampaignRun(routeId, run.rawBrief.text))}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function CampaignRunResult({ run, onSelectRoute }: { run: CampaignRun; onSelectRoute: (routeId: string) => void }) {
  return (
    <section className="grid gap-6">
      <p className="rounded-lg border border-stone-300 bg-white p-4 text-sm leading-6 text-stone-700">
        {run.disclaimer}
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
      <RouteComparisonTable matrix={run.comparisonMatrix} />
      <Card>
        <CardHeader>
          <CardTitle>Human Route Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
          {run.humanSelection ? (
            <>
              <p>
                Mock creative lead selected{" "}
                <span className="font-medium text-stone-950">{run.executionPlan?.selectedRouteName}</span> before
                generating the execution plan.
              </p>
              <p className="text-stone-500">{run.humanSelection.rationale}</p>
            </>
          ) : (
            <>
              <p>
                This run is awaiting explicit human selection. The execution plan is intentionally blocked until a
                route is selected.
              </p>
              <div className="flex flex-wrap gap-3">
                {run.routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => onSelectRoute(route.id)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 font-medium text-stone-950 hover:bg-stone-100"
                  >
                    Select {route.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pre-mortem Risk Review</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
          <p className="font-medium text-stone-950">{run.premortem.summary}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {run.premortem.routeRisks.map((routeRisk) => (
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
      {run.executionPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Execution Plan Preview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-stone-700">
            <p className="text-base font-medium text-stone-950">{run.executionPlan.selectedRouteName}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <PlanList title="Assets" items={run.executionPlan.assetList} />
              <PlanList title="Metrics" items={run.executionPlan.metrics} />
            </div>
            <div className="grid gap-3">
              {run.executionPlan.timeline.map((phase) => (
                <div key={phase.phase} className="rounded-md bg-stone-100 p-4">
                  <p className="font-medium text-stone-950">
                    {phase.phase}: {phase.timing}
                  </p>
                  <p>{phase.actions.join(", ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Execution Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-stone-700">
            No execution plan yet. Human route selection is required before final plan generation.
          </CardContent>
        </Card>
      )}
      <TraceTimeline events={run.traceEvents} />
    </section>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <ul className="mt-2 list-inside list-disc">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
