#!/usr/bin/env node
// Manual end-to-end test for the real OpenAI API chain.
// Run against a dev server that is already running: pnpm dev
// Does NOT run in CI. Does NOT commit secrets.
// Usage: node scripts/test-real-chain.mjs
//   or:  pnpm test:real-chain

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const MESSY_BRIEF =
  "Okay so we need a campaign for a small fashion/lifestyle brand based between " +
  "Madrid and Lisbon. New capsule collection, low-medium budget, audience is creative " +
  "professionals, design students, people who work from cafés and studios. We want it " +
  "to feel quiet but magnetic, not a fake streetwear drop. Mostly Instagram and email, " +
  "maybe pop-up. Need cultural relevance but also conversion.";

let failed = false;

function log(label, summary) {
  console.log(`\n── ${label} ──`);
  console.log(summary);
}

function fail(label, reason) {
  console.error(`\n✗ ${label} FAILED: ${reason}`);
  failed = true;
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ---------------------------------------------------------------------------
// Stage 1 — Normalize
// ---------------------------------------------------------------------------
console.log(`\nTesting real OpenAI chain against ${BASE_URL}\n`);
console.log("Brief:", MESSY_BRIEF.slice(0, 80) + "...");

let normalizedBrief;
{
  const { status, body } = await post("/api/campaign/normalize", { text: MESSY_BRIEF });
  if (status !== 200) {
    fail("normalize", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    normalizedBrief = body.normalizedBrief;
    const provider = body.traceEvent?.provider ?? "unknown";
    log("normalize ✓", `brand=${normalizedBrief?.brandName ?? "?"}, provider=${provider}`);
  }
}
if (!normalizedBrief) {
  console.error("\nCannot continue without normalizedBrief. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 2 — Tension
// ---------------------------------------------------------------------------
let strategicTension;
{
  const { status, body } = await post("/api/campaign/tension", { normalizedBrief });
  if (status !== 200) {
    fail("tension", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    strategicTension = body.strategicTension;
    const provider = body.traceEvent?.provider ?? "unknown";
    log(
      "tension ✓",
      `coreTension="${(strategicTension?.coreTension ?? "").slice(0, 80)}..." provider=${provider}`,
    );
  }
}
if (!strategicTension) {
  console.error("\nCannot continue without strategicTension. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 3 — Routes
// ---------------------------------------------------------------------------
let routes;
{
  const { status, body } = await post("/api/campaign/routes", {
    normalizedBrief,
    strategicTension,
  });
  if (status !== 200) {
    fail("routes", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    routes = body.routes ?? [];
    const provider = body.traceEvent?.provider ?? "unknown";
    log("routes ✓", `count=${routes.length}, provider=${provider}`);
    for (const r of routes) {
      console.log(`  [${r.id}] ${r.name} (${r.strategicRole})`);
    }
    if (routes.length < 3) fail("routes", `Expected 3+ routes, got ${routes.length}`);
  }
}
if (!routes?.length) {
  console.error("\nCannot continue without routes. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 4 — Personas
// ---------------------------------------------------------------------------
let personas;
{
  const { status, body } = await post("/api/campaign/personas", {
    normalizedBrief,
    strategicTension,
    routes,
  });
  if (status !== 200) {
    fail("personas", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    personas = body.personas ?? [];
    const provider = body.traceEvent?.provider ?? "unknown";
    log("personas ✓", `count=${personas.length}, provider=${provider}`);
    for (const p of personas) {
      console.log(`  [${p.id}] ${p.name}`);
    }
    if (personas.length < 3) fail("personas", `Expected 3+ personas, got ${personas.length}`);
  }
}
if (!personas?.length) {
  console.error("\nCannot continue without personas. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 5 — Simulations
// ---------------------------------------------------------------------------
let simulations;
{
  const { status, body } = await post("/api/campaign/simulations", {
    normalizedBrief,
    strategicTension,
    routes,
    personas,
  });
  if (status !== 200) {
    fail("simulations", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    simulations = body.simulations ?? [];
    const provider = body.traceEvent?.provider ?? "unknown";
    const expectedCount = routes.length * personas.length;
    log(
      "simulations ✓",
      `count=${simulations.length}/${expectedCount} (routes×personas), provider=${provider}`,
    );
    if (simulations.length !== expectedCount) {
      fail("simulations", `Expected ${expectedCount} simulations, got ${simulations.length}`);
    }
    const allHaveCaveat = simulations.every((s) =>
      s.caveat?.toLowerCase().includes("synthetic"),
    );
    if (!allHaveCaveat) fail("simulations", "Some simulations missing synthetic caveat");
  }
}
if (!simulations?.length) {
  console.error("\nCannot continue without simulations. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 6 — Scores (deterministic)
// ---------------------------------------------------------------------------
let scores;
{
  const { status, body } = await post("/api/campaign/scores", {
    routes,
    personas,
    simulations,
  });
  if (status !== 200) {
    fail("scores", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    scores = body.scores ?? [];
    const provider = body.traceEvent?.provider ?? "unknown";
    log("scores ✓", `count=${scores.length}, provider=${provider}`);
    for (const s of scores) {
      console.log(`  [${s.routeId}] score=${s.weightedTotal}`);
    }
    if (scores.length !== routes.length) {
      fail("scores", `Expected ${routes.length} scores, got ${scores.length}`);
    }
  }
}
if (!scores?.length) {
  console.error("\nCannot continue without scores. Exiting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stage 7 — Premortem
// ---------------------------------------------------------------------------
{
  const { status, body } = await post("/api/campaign/premortem", {
    normalizedBrief,
    strategicTension,
    routes,
    personas,
    simulations,
    scores,
  });
  if (status !== 200) {
    fail("premortem", `HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  } else {
    const routeRisks = body.review?.routeRisks ?? [];
    const provider = body.traceEvent?.provider ?? "unknown";
    log("premortem ✓", `routeRisks=${routeRisks.length}, provider=${provider}`);
    for (const r of routeRisks) {
      console.log(`  [${r.routeId}] risks=${r.risks?.length ?? 0}`);
    }
    if (routeRisks.length !== routes.length) {
      fail("premortem", `Expected ${routes.length} route risks, got ${routeRisks.length}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "─".repeat(60));
if (failed) {
  console.error("✗ One or more stages FAILED. See above for details.");
  process.exit(1);
} else {
  console.log("✓ All stages passed.");
  process.exit(0);
}
