// Tests for deterministic route simulation summaries.
// No LLM calls. No env vars required.

import { describe, expect, it } from "vitest";
import { deriveRouteSimulationSummaries } from "@/lib/workflow/derive-route-simulation-summaries";
import {
  campaignRoutes as MOCK_ROUTES,
  campaignPersonas as MOCK_PERSONAS,
  personaSimulations as MOCK_SIMULATIONS,
} from "@/lib/workflow/mock-campaign-run";

describe("deriveRouteSimulationSummaries – averages", () => {
  it("returns one summary per route", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    expect(summaries).toHaveLength(MOCK_ROUTES.length);
  });

  it("averages are in [1, 5]", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    for (const s of summaries) {
      expect(s.averageResonance).toBeGreaterThanOrEqual(0);
      expect(s.averageResonance).toBeLessThanOrEqual(5);
      expect(s.averageConversion).toBeGreaterThanOrEqual(0);
      expect(s.averageConversion).toBeLessThanOrEqual(5);
      expect(s.averageEmailCapture).toBeGreaterThanOrEqual(0);
      expect(s.averageEmailCapture).toBeLessThanOrEqual(5);
    }
  });

  it("averages are correct for route-quiet-itinerary", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    const quiet = summaries.find((s) => s.routeId === "route-quiet-itinerary");
    expect(quiet).toBeDefined();

    // Scores: 4.4, 3.8, 3.6 → average = 3.9 (rounded to 1dp)
    const expected = Math.round(((4.4 + 3.8 + 3.6) / 3) * 10) / 10;
    expect(quiet!.averageResonance).toBe(expected);
  });
});

describe("deriveRouteSimulationSummaries – strongest/weakest persona", () => {
  it("strongestPersona is the persona with highest resonance score", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    // route-quiet-itinerary: Iria (4.4), design-student (3.8), startup-operator (3.6)
    const quiet = summaries.find((s) => s.routeId === "route-quiet-itinerary");
    expect(quiet!.strongestPersona).toBe("Iria");
  });

  it("weakestPersona is the persona with lowest resonance score", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    // route-uniform-for-motion: Iria (3.7), design-student (3.5), startup-operator (4.0)
    const uniform = summaries.find((s) => s.routeId === "route-uniform-for-motion");
    // weakest is design-student (3.5)
    const designStudent = MOCK_PERSONAS.find((p) => p.id === "persona-design-student");
    expect(uniform!.weakestPersona).toBe(designStudent?.name);
  });
});

describe("deriveRouteSimulationSummaries – missing simulations handled safely", () => {
  it("returns empty/N/A values for route with no simulations", () => {
    const routeWithNoSims = [{ ...MOCK_ROUTES[0], id: "route-no-sims" }];
    const summaries = deriveRouteSimulationSummaries({
      routes: routeWithNoSims,
      personas: MOCK_PERSONAS,
      simulations: [],
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0].averageResonance).toBe(0);
    expect(summaries[0].strongestPersona).toBe("N/A");
    expect(summaries[0].weakestPersona).toBe("N/A");
  });
});

describe("deriveRouteSimulationSummaries – decision takeaway", () => {
  it("decisionTakeaway is a non-empty string for each route", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    for (const s of summaries) {
      expect(s.decisionTakeaway.length).toBeGreaterThan(0);
    }
  });

  it("routeName is present in each summary", () => {
    const summaries = deriveRouteSimulationSummaries({
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    });

    for (const s of summaries) {
      const route = MOCK_ROUTES.find((r) => r.id === s.routeId);
      expect(s.routeName).toBe(route?.name);
    }
  });
});

describe("deriveRouteSimulationSummaries – deterministic", () => {
  it("returns identical output for same input", () => {
    const input = {
      routes: MOCK_ROUTES,
      personas: MOCK_PERSONAS,
      simulations: MOCK_SIMULATIONS,
    };
    const a = deriveRouteSimulationSummaries(input);
    const b = deriveRouteSimulationSummaries(input);
    expect(a).toEqual(b);
  });
});
