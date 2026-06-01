import { Card, CardContent } from "@/components/ui/card";
import type { TraceEvent } from "@/lib/schemas/trace";
import type { CampaignRoute, Persona, PersonaSimulation, RouteComparisonMatrix } from "@/lib/schemas/campaign";

interface RunMetadataPanelProps {
  traceEvents: TraceEvent[];
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
  comparison?: RouteComparisonMatrix;
}

const DETERMINISTIC_STAGES = new Set(["score_routes", "compare_routes"]);

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(1) + "s";
}

export function RunMetadataPanel({ traceEvents, routes, personas, simulations, comparison }: RunMetadataPanelProps) {
  const completedEvents = traceEvents.filter((e) => e.status === "completed" && e.durationMs != null);

  const totalMs = completedEvents.reduce((sum, e) => sum + (e.durationMs ?? 0), 0);
  const llmMs = completedEvents
    .filter((e) => !DETERMINISTIC_STAGES.has(e.stageId))
    .reduce((sum, e) => sum + (e.durationMs ?? 0), 0);

  const providers = [...new Set(completedEvents.map((e) => e.provider).filter(Boolean))];
  const models = [...new Set(completedEvents.map((e) => e.model).filter(Boolean))];
  const llmProviders = providers.filter((p) => p !== "deterministic" && p !== "mock");

  let providerLabel = "Unknown";
  if (providers.includes("openai")) providerLabel = "OpenAI";
  else if (providers.includes("mock")) providerLabel = "Mock";
  if (providers.includes("deterministic") && llmProviders.length > 0) providerLabel += " + deterministic";
  else if (providers.includes("deterministic") && providers.includes("mock")) providerLabel = "Mock + deterministic";
  else if (providers.every((p) => p === "deterministic")) providerLabel = "Deterministic";

  const modelLabel = models.filter((m) => m !== "mock-normalizer" && !m?.startsWith("mock-")).join(", ") || models.join(", ") || "—";

  const recommendedRoute = comparison
    ? routes.find((r) => r.id === comparison.recommendedRouteId)
    : null;

  const stats: Array<{ label: string; value: string }> = [
    { label: "Provider", value: providerLabel },
    { label: "Model", value: modelLabel || "—" },
    { label: "Total runtime", value: totalMs > 0 ? msToSeconds(totalMs) : "—" },
    { label: "LLM runtime", value: llmMs > 0 ? msToSeconds(llmMs) : "—" },
    { label: "Stages", value: String(completedEvents.length) },
    { label: "Routes", value: String(routes.length) },
    { label: "Personas", value: String(personas.length) },
    { label: "Simulations", value: String(simulations.length) },
    ...(recommendedRoute
      ? [{ label: "Recommended", value: recommendedRoute.name }]
      : []),
  ];

  return (
    <Card className="border-stone-200 bg-stone-50">
      <CardContent className="py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-stone-600">
              <span className="font-semibold uppercase tracking-[0.1em] text-stone-400">{label}</span>
              <span className="text-stone-700">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
