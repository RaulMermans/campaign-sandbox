"use client";

import { useState } from "react";
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
            <SimulationCard
              key={`${simulation.routeId}-${simulation.personaId}`}
              simulation={simulation}
              personaName={persona?.name}
              routeName={route?.name}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function SimulationCard({
  simulation,
  personaName,
  routeName,
}: {
  simulation: PersonaSimulation;
  personaName?: string;
  routeName?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-md border border-stone-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {personaName} on {routeName}
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

      {expanded && (
        <div className="mt-4 grid gap-3 border-t border-stone-100 pt-3">
          <DecisionField label="Understood message" value={simulation.understoodMessage} />
          <DecisionField label="Main objection" value={simulation.mainObjection} />
          <DecisionField label="Action trigger" value={simulation.actionTrigger} />
          <div className="rounded-md bg-stone-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1">Best CTA</p>
            <p className="text-sm font-medium text-stone-800">{simulation.bestCTA}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-stone-400 hover:text-stone-700"
      >
        {expanded ? "Collapse" : "Expand decision fields"}
      </button>

      <p className="mt-3 text-xs leading-5 text-stone-500">{simulation.caveat}</p>
    </article>
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

function DecisionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1">{label}</p>
      <p className="text-sm leading-5 text-stone-700">{value}</p>
    </div>
  );
}
