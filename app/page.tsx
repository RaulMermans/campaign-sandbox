"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BriefDrawer } from "@/components/layout/brief-drawer";
import { BriefIntakePanel } from "@/components/intake/brief-intake-panel";
import { ResultsWorkspace } from "@/components/layout/results-workspace";
import type {
  CampaignExecutionPlan,
  CampaignRunOutput,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";

const WORKFLOW_STEPS = [
  "Normalizing brief",
  "Extracting strategic tension",
  "Generating routes",
  "Building personas",
  "Simulating reactions",
  "Scoring routes",
  "Reviewing risks",
  "Comparing routes",
];

interface RunError {
  message: string;
  code?: string;
  stageId?: string;
}

export default function Home() {
  const [brief, setBrief] = useState("");
  const [run, setRun] = useState<CampaignRunOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<RunError | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<CampaignExecutionPlan | null>(null);
  const [executionTraceEvent, setExecutionTraceEvent] = useState<TraceEvent | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const mode = run || isRunning ? "results" : "intake";

  function handleNewRun() {
    setRun(null);
    setError(null);
    setSelectedRouteId(null);
    setExecutionPlan(null);
    setExecutionTraceEvent(null);
    setPlanError(null);
  }

  function scrollToExport() {
    document.getElementById("export")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setRun(null);
    setActiveStep(0);
    setSelectedRouteId(null);
    setExecutionPlan(null);
    setExecutionTraceEvent(null);
    setPlanError(null);

    const stepTimer = setInterval(() => {
      setActiveStep((s) => (s < WORKFLOW_STEPS.length - 1 ? s + 1 : s));
    }, 4000);

    try {
      const response = await fetch("/api/campaign/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brief, mode: "fast" }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const d =
          typeof data === "object" && data !== null
            ? (data as Record<string, unknown>)
            : {};
        const runError: RunError = {
          message: "error" in d ? String(d.error) : "Campaign run failed.",
        };
        if ("code" in d) runError.code = String(d.code);
        if ("stageId" in d) runError.stageId = String(d.stageId);
        setError(runError);
        return;
      }
      setRun(data as CampaignRunOutput);
    } catch {
      setError({ message: "Network error. Please try again." });
    } finally {
      clearInterval(stepTimer);
      setIsRunning(false);
    }
  }

  async function handleGeneratePlan() {
    if (!run || !selectedRouteId) return;

    setIsGeneratingPlan(true);
    setPlanError(null);
    setExecutionPlan(null);
    setExecutionTraceEvent(null);

    try {
      const response = await fetch("/api/campaign/execution-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRouteId,
          normalizedBrief: run.normalizedBrief,
          strategicTension: run.strategicTension,
          routes: run.routes,
          personas: run.personas,
          simulations: run.simulations,
          scores: run.scores,
          premortemReview: run.premortemReview,
          comparison: run.comparison,
          runId: run.runId,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Execution plan generation failed.";
        setPlanError(msg);
        return;
      }
      const result = data as { executionPlan: CampaignExecutionPlan; traceEvent: TraceEvent };
      setExecutionPlan(result.executionPlan);
      setExecutionTraceEvent(result.traceEvent);

      setTimeout(() => {
        document
          .getElementById("execution-plan")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setPlanError("Network error. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  return (
    <AppShell
      mode={mode}
      onNewRun={mode === "results" ? handleNewRun : undefined}
      hasExecutionPlan={!!executionPlan}
      onExport={executionPlan ? scrollToExport : undefined}
      isRunning={isRunning}
    >
      {mode === "intake" ? (
        /* ── Intake Mode ── */
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-14">
          {/* Left: editorial hero */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Creative strategy workspace
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-none text-stone-950 md:text-7xl">
              Campaign Sandbox
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-700">
              Normalize a messy brief, generate strategic routes, simulate synthetic audience
              reactions, and compare tradeoffs before committing to a plan.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600">
              Runs execute server-side through the campaign workflow. LLM-backed stages use the
              configured provider; scoring and comparison are deterministic. Synthetic persona
              reactions are planning hypotheses, not market research or success predictions.
            </p>
          </div>

          {/* Right: intake */}
          <div className="grid gap-6">
            <div className="rounded-xl border border-stone-300 bg-white p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Campaign brief
              </p>
              <BriefIntakePanel
                brief={brief}
                onBriefChange={setBrief}
                onRun={handleRun}
                isRunning={isRunning}
              />
            </div>
          </div>
        </section>
      ) : (
        /* ── Results Workspace Mode ── */
        <>
          {/* Collapsible brief drawer below top bar */}
          <BriefDrawer
            briefText={brief}
            onEditBrief={setBrief}
            onRerun={handleRun}
            isRunning={isRunning}
          />

          {/* Running progress indicator */}
          {isRunning ? (
            <div className="border-b border-stone-200 bg-white px-5 py-4 md:px-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Running campaign workflow
              </p>
              <ol className="flex flex-wrap gap-x-6 gap-y-1">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <li
                    key={step}
                    className={`flex items-center gap-1.5 text-xs ${
                      idx === activeStep
                        ? "font-semibold text-stone-950"
                        : idx < activeStep
                          ? "text-stone-400"
                          : "text-stone-300"
                    }`}
                  >
                    <span
                      className={`h-1 w-1 shrink-0 rounded-full ${
                        idx === activeStep
                          ? "bg-stone-950"
                          : idx < activeStep
                            ? "bg-stone-300"
                            : "bg-stone-200"
                      }`}
                    />
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Error state */}
          {error ? (
            <div className="mx-auto max-w-7xl px-5 pt-4 md:px-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error.stageId ? (
                  <>
                    <p className="font-medium">Run failed at stage: {error.stageId}</p>
                    <p className="mt-1">Reason: {error.message}</p>
                  </>
                ) : (
                  <p>{error.message}</p>
                )}
                {error.code ? (
                  <p className="mt-1.5 text-xs text-red-600">Code: {error.code}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleNewRun}
                  className="mt-3 text-xs font-medium text-red-700 underline hover:text-red-900"
                >
                  Start over
                </button>
              </div>
            </div>
          ) : null}

          {/* Results */}
          {run ? (
            <ResultsWorkspace
              run={run}
              isRunning={isRunning}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              onGeneratePlan={handleGeneratePlan}
              isGeneratingPlan={isGeneratingPlan}
              planError={planError}
              executionPlan={executionPlan}
              executionTraceEvent={executionTraceEvent}
            />
          ) : null}
        </>
      )}
    </AppShell>
  );
}
