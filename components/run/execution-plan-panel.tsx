"use client";

import type { CampaignExecutionPlan } from "@/lib/schemas/campaign";

interface ExecutionPlanPanelProps {
  plan: CampaignExecutionPlan;
}

export function ExecutionPlanPanel({ plan }: ExecutionPlanPanelProps) {
  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Execution Plan
        </p>
        <h2 className="mt-1 text-xl font-semibold text-stone-950">{plan.planTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">{plan.strategicSummary}</p>
      </div>

      {/* Assumptions */}
      <Section title="Assumptions">
        <ul className="grid gap-1">
          {plan.assumptions.map((a) => (
            <li key={a} className="flex gap-2 text-sm leading-6 text-stone-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
              {a}
            </li>
          ))}
        </ul>
      </Section>

      {/* Launch Phases */}
      <Section title="Launch Phases">
        <div className="grid gap-4">
          {plan.launchPhases.map((lp) => (
            <div key={lp.phase} className="rounded-md border border-stone-200 p-4">
              <div className="flex items-baseline gap-3">
                <p className="text-sm font-semibold text-stone-950">{lp.phase}</p>
                <p className="text-xs text-stone-400">{lp.timing}</p>
              </div>
              <p className="mt-1 text-sm text-stone-600">{lp.objective}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1">
                    Key Actions
                  </p>
                  <ul className="grid gap-1">
                    {lp.keyActions.map((a) => (
                      <li key={a} className="flex gap-2 text-sm text-stone-700">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1">
                    Deliverables
                  </p>
                  <ul className="grid gap-1">
                    {lp.deliverables.map((d) => (
                      <li key={d} className="flex gap-2 text-sm text-stone-700">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Channel Plan */}
      <Section title="Channel Plan">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plan.channelPlan.map((ch) => (
            <div key={ch.channel} className="rounded-md border border-stone-200 p-4">
              <p className="text-sm font-semibold text-stone-950">{ch.channel}</p>
              <p className="mt-1 text-sm text-stone-600">{ch.role}</p>
              <ul className="mt-2 grid gap-1">
                {ch.recommendedAssets.map((a) => (
                  <li key={a} className="text-xs text-stone-500">
                    · {a}
                  </li>
                ))}
              </ul>
              {ch.notes ? (
                <p className="mt-2 text-xs italic text-stone-400">{ch.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      {/* Asset List */}
      <Section title="Asset List">
        <ul className="grid gap-1 sm:grid-cols-2">
          {plan.assetList.map((a) => (
            <li key={a} className="flex gap-2 text-sm text-stone-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              {a}
            </li>
          ))}
        </ul>
      </Section>

      {/* Copy Examples */}
      <Section title="Copy Examples">
        <ul className="grid gap-2">
          {plan.copyExamples.map((c) => (
            <li
              key={c}
              className="rounded-md bg-stone-50 px-4 py-2.5 text-sm italic text-stone-700"
            >
              &ldquo;{c}&rdquo;
            </li>
          ))}
        </ul>
      </Section>

      {/* Measurement Plan */}
      <Section title="Measurement Plan">
        <div className="grid gap-2">
          {plan.measurementPlan.map((m) => (
            <div key={m.metric} className="flex gap-3 rounded-md border border-stone-100 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">{m.metric}</p>
                <p className="text-sm text-stone-500">{m.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Risks and Mitigations */}
      <Section title="Risks and Mitigations">
        <div className="grid gap-3">
          {plan.risksAndMitigations.map((rm) => (
            <div key={rm.risk} className="rounded-md border border-amber-100 bg-amber-50/40 p-4">
              <p className="flex gap-2 text-sm font-medium text-stone-800">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-amber-500">⚠</span>
                {rm.risk}
              </p>
              <p className="mt-1.5 text-sm text-stone-600">
                <span className="font-medium text-stone-700">Mitigation: </span>
                {rm.mitigation}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Next Actions */}
      <Section title="Next Actions">
        <ol className="grid gap-2">
          {plan.nextActions.map((a, i) => (
            <li key={a} className="flex gap-3 text-sm text-stone-700">
              <span className="shrink-0 font-semibold text-stone-400">{i + 1}.</span>
              {a}
            </li>
          ))}
        </ol>
      </Section>

      {/* Disclaimer */}
      <p className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-400">
        This execution plan is a strategic planning document. Assumptions, copy examples, and channel
        recommendations are hypotheses for team review, not validated recommendations. Synthetic
        audience reactions used in planning are not real market research or success predictions.
        Claims touching time, sustainability, savings, or behavior change require legal and
        substantiation review before publication.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {title}
      </p>
      {children}
    </div>
  );
}
