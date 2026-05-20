import { NormalizedBriefPanel } from "@/components/brief/normalized-brief-panel";
import { CampaignRouteCard } from "@/components/routes/campaign-route-card";
import { RouteComparisonTable } from "@/components/routes/route-comparison-table";
import { PersonaSimulationPanel } from "@/components/simulation/persona-simulation-panel";
import { TraceTimeline } from "@/components/trace/trace-timeline";
import { buildMockCampaignRun } from "@/lib/workflow/mock-campaign-run";

export default async function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = buildMockCampaignRun();

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-950 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Run {runId}</p>
          <h1 className="mt-3 text-4xl font-semibold">Campaign Sandbox Result</h1>
        </div>
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
        <TraceTimeline events={run.traceEvents} />
      </section>
    </main>
  );
}
