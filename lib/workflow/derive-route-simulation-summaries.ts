// Deterministic route-level simulation summaries.
// Aggregates persona simulations per route — no LLM, no model calls.

import type { CampaignRoute, Persona, PersonaSimulation } from "@/lib/schemas/campaign";

export type RouteSimulationSummary = {
  routeId: string;
  routeName: string;
  averageResonance: number;
  averageConversion: number;
  averageEmailCapture: number;
  strongestPersona: string;
  weakestPersona: string;
  mainObjection: string;
  actionTrigger: string;
  bestCTA: string;
  decisionTakeaway: string;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

function mostCommonString(strings: string[]): string {
  if (strings.length === 0) return "";
  const freq = new Map<string, number>();
  for (const s of strings) {
    const norm = s.trim().toLowerCase();
    freq.set(norm, (freq.get(norm) ?? 0) + 1);
  }
  const best = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  // Return the original (not lowercased) version
  return strings.find((s) => s.trim().toLowerCase() === best[0]) ?? strings[0];
}

function deriveDecisionTakeaway(
  routeName: string,
  avgResonance: number,
  avgConversion: number,
  strongestPersona: string,
  weakestPersona: string,
  mainObjection: string,
): string {
  if (avgResonance >= 4 && avgConversion >= 4) {
    return `${routeName} shows strong resonance and conversion intent across simulated personas. Watch for: ${mainObjection.toLowerCase()}.`;
  }
  if (avgResonance >= 4 && avgConversion < 3) {
    return `${routeName} resonates well but conversion intent is weaker — a clearer CTA or product evidence may help.`;
  }
  if (avgResonance < 3) {
    return `${routeName} has muted resonance across personas. ${weakestPersona} is the most skeptical. Consider whether the message is specific enough.`;
  }
  if (avgConversion >= 4) {
    return `${routeName} has clear conversion intent, led by ${strongestPersona}. Resonance is moderate — brand storytelling may strengthen the overall case.`;
  }
  return `${routeName} has moderate resonance and conversion. Strongest with ${strongestPersona}. Primary objection: ${mainObjection.toLowerCase()}.`;
}

export function deriveRouteSimulationSummaries(input: {
  routes: CampaignRoute[];
  personas: Persona[];
  simulations: PersonaSimulation[];
}): RouteSimulationSummary[] {
  const { routes, personas, simulations } = input;

  return routes.map((route) => {
    const routeSims = simulations.filter((s) => s.routeId === route.id);

    if (routeSims.length === 0) {
      return {
        routeId: route.id,
        routeName: route.name,
        averageResonance: 0,
        averageConversion: 0,
        averageEmailCapture: 0,
        strongestPersona: "N/A",
        weakestPersona: "N/A",
        mainObjection: "No simulations available",
        actionTrigger: "N/A",
        bestCTA: "N/A",
        decisionTakeaway: `No simulation data available for ${route.name}.`,
      };
    }

    const averageResonance = average(routeSims.map((s) => s.resonanceScore));
    const averageConversion = average(routeSims.map((s) => s.conversionIntent));
    const averageEmailCapture = average(routeSims.map((s) => s.signupIntent));

    const sorted = [...routeSims].sort((a, b) => b.resonanceScore - a.resonanceScore);
    const strongestSim = sorted[0];
    const weakestSim = sorted[sorted.length - 1];

    const strongestPersona =
      personas.find((p) => p.id === strongestSim.personaId)?.name ?? strongestSim.personaId;
    const weakestPersona =
      personas.find((p) => p.id === weakestSim.personaId)?.name ?? weakestSim.personaId;

    const mainObjection = mostCommonString(routeSims.map((s) => s.mainObjection));
    const actionTrigger = mostCommonString(routeSims.map((s) => s.actionTrigger));
    const bestCTA = mostCommonString(routeSims.map((s) => s.bestCTA));

    const decisionTakeaway = deriveDecisionTakeaway(
      route.name,
      averageResonance,
      averageConversion,
      strongestPersona,
      weakestPersona,
      mainObjection,
    );

    return {
      routeId: route.id,
      routeName: route.name,
      averageResonance,
      averageConversion,
      averageEmailCapture,
      strongestPersona,
      weakestPersona,
      mainObjection,
      actionTrigger,
      bestCTA,
      decisionTakeaway,
    };
  });
}
