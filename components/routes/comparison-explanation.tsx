"use client";

import type { DecisionSummary } from "@/lib/workflow/build-decision-summary";

interface ComparisonExplanationProps {
  summary: DecisionSummary;
}

export function ComparisonExplanation({ summary }: ComparisonExplanationProps) {
  return (
    <div className="workspace-readable rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
        Strategic read
      </p>

      <div className="grid gap-3 text-sm leading-6 text-stone-700">
        <p>
          <span className="font-medium text-stone-900">{summary.recommendedRouteName} leads</span>{" "}
          because{" "}
          {summary.whyItWins.replace(/^Leads because of/, "").replace(/^Leads on balance/, "on balance").trim()}
        </p>

        {summary.runnerUpStrength ? (
          <p>
            <span className="font-medium text-stone-900">Runner-up: </span>
            {summary.runnerUpStrength}
          </p>
        ) : null}

        <p>
          <span className="font-medium text-stone-900">Biggest tradeoff: </span>
          {summary.biggestTradeoff}
        </p>

        {summary.closeScoreNotice ? (
          <p className="text-xs leading-5 text-stone-500">{summary.closeScoreNotice}</p>
        ) : null}

        <p className="text-xs leading-5 text-stone-400">
          Override the recommendation if your brief constraints, audience knowledge, or production
          context shifts the risk calculus. Human judgment takes precedence.
        </p>
      </div>
    </div>
  );
}
