import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignRoute, Persona, PersonaSimulation } from "@/lib/schemas/campaign";

export function PersonaSimulationPanel({
  personas,
  simulations,
  routes,
}: {
  personas: Persona[];
  simulations: PersonaSimulation[];
  routes: CampaignRoute[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthetic Audience Simulation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {simulations.map((simulation) => {
          const persona = personas.find((item) => item.id === simulation.personaId);
          const route = routes.find((item) => item.id === simulation.routeId);
          return (
            <article key={`${simulation.routeId}-${simulation.personaId}`} className="rounded-md border border-stone-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {persona?.name} on {route?.name}
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-stone-950">
                <q>{simulation.quotedReaction}</q>
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-700">{simulation.likelyReaction}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-stone-600">
                <Metric label="Res" value={simulation.resonanceScore} />
                <Metric label="Buy" value={simulation.conversionIntent} />
                <Metric label="Email" value={simulation.signupIntent} />
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">{simulation.caveat}</p>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md bg-stone-100 px-2 py-2">
      <span className="block font-semibold text-stone-950">{value.toFixed(1)}</span>
      {label}
    </span>
  );
}
