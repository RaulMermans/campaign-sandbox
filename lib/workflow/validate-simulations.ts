// Deterministic cross-reference validator for persona simulations.
// Called after Zod schema validation to enforce full route/persona matrix coverage.
// Throws LlmSchemaValidationError when provider output passes Zod but fails
// cross-reference rules (unknown IDs, missing pairs, duplicate pairs).
// No LLM calls. No side effects.

import type { CampaignRoute, Persona, PersonaSimulation } from "@/lib/schemas/campaign";
import { LlmSchemaValidationError } from "@/lib/llm/errors";

export interface ValidateSimulationCoverageInput {
  simulations: PersonaSimulation[];
  routes: CampaignRoute[];
  personas: Persona[];
}

/**
 * Validate that provider-returned simulations cover every route/persona pair.
 *
 * Rules:
 * 1. Every simulation.routeId must match a known route ID.
 * 2. Every simulation.personaId must match a known persona ID.
 * 3. Every route/persona pair must have exactly one simulation.
 *    If there are R routes and P personas, exactly R × P simulations are expected.
 *
 * Throws LlmSchemaValidationError with a structured issues list if any rule fails.
 * Returns void on success.
 */
export function validateSimulationCoverage(input: ValidateSimulationCoverageInput): void {
  const { simulations, routes, personas } = input;

  const routeIds = new Set(routes.map((r) => r.id));
  const personaIds = new Set(personas.map((p) => p.id));
  const expectedCount = routeIds.size * personaIds.size;

  const issues: string[] = [];

  // Track which pairs we have seen so far.
  const seenPairs = new Map<string, number>();

  for (const simulation of simulations) {
    const { routeId, personaId } = simulation;

    if (!routeIds.has(routeId)) {
      issues.push(
        `simulation references unknown routeId "${routeId}". Valid route IDs: ${[...routeIds].join(", ")}.`,
      );
    }

    if (!personaIds.has(personaId)) {
      issues.push(
        `simulation references unknown personaId "${personaId}". Valid persona IDs: ${[...personaIds].join(", ")}.`,
      );
    }

    const pairKey = `${routeId}:${personaId}`;
    seenPairs.set(pairKey, (seenPairs.get(pairKey) ?? 0) + 1);
  }

  // Check for missing or duplicated pairs.
  for (const routeId of routeIds) {
    for (const personaId of personaIds) {
      const pairKey = `${routeId}:${personaId}`;
      const count = seenPairs.get(pairKey) ?? 0;

      if (count === 0) {
        issues.push(
          `missing simulation for route "${routeId}" and persona "${personaId}". Expected ${expectedCount} simulations total (${routeIds.size} routes × ${personaIds.size} personas).`,
        );
      } else if (count > 1) {
        issues.push(
          `duplicate simulation for route "${routeId}" and persona "${personaId}" (found ${count} entries, expected 1).`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new LlmSchemaValidationError(
      `Simulation coverage validation failed: ${issues.length} issue(s) found.`,
      issues.map((message) => ({ path: ["simulations"], message })),
    );
  }
}
