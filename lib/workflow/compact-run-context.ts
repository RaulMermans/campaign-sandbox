// Server-side only. Do not import in client components.
// Produces a compact simulation payload for premortem input to reduce prompt token count in fast mode.

import type { PersonaSimulation } from "@/lib/schemas/campaign";

export interface CompactSimulation {
  routeId: string;
  personaId: string;
  resonanceScore: number;
  conversionIntent: number;
  signupIntent: number;
  topObjection: string;
  caveat: string;
}

export function compactSimulations(simulations: PersonaSimulation[]): CompactSimulation[] {
  return simulations.map((s) => ({
    routeId: s.routeId,
    personaId: s.personaId,
    resonanceScore: s.resonanceScore,
    conversionIntent: s.conversionIntent,
    signupIntent: s.signupIntent,
    topObjection: s.objections[0] ?? "None",
    caveat: s.caveat,
  }));
}
