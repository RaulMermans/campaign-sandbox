// Deterministic cross-reference validator for route scores.
// Called after scoring to enforce full route coverage and uniqueness.
// Throws WorkflowValidationError when scores fail cross-reference rules.
// No LLM calls. No side effects.

import type { CampaignRoute, RouteScore } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export interface ValidateRouteScoreCoverageInput {
  scores: RouteScore[];
  routes: CampaignRoute[];
}

/**
 * Validate that scores cover every route exactly once.
 *
 * Rules:
 * 1. Every score.routeId must reference a known route ID.
 * 2. Every route must have exactly one score.
 * 3. No duplicate route scores.
 *    If there are R routes, exactly R scores are expected.
 *
 * Throws WorkflowValidationError with a structured issues list if any rule fails.
 * Returns void on success.
 */
export function validateRouteScoreCoverage(
  input: ValidateRouteScoreCoverageInput,
): void {
  const { scores, routes } = input;

  const routeIds = new Set(routes.map((r) => r.id));
  const issues: Array<{ path: Array<string | number>; message: string }> = [];
  const seenRouteIds = new Map<string, number>();

  for (const score of scores) {
    const { routeId } = score;

    if (!routeIds.has(routeId)) {
      issues.push({
        path: ["scores"],
        message: `score references unknown routeId "${routeId}". Valid route IDs: ${[...routeIds].join(", ")}.`,
      });
    }

    seenRouteIds.set(routeId, (seenRouteIds.get(routeId) ?? 0) + 1);
  }

  for (const routeId of routeIds) {
    const count = seenRouteIds.get(routeId) ?? 0;

    if (count === 0) {
      issues.push({
        path: ["scores"],
        message: `missing score for route "${routeId}". Expected ${routeIds.size} scores total (one per route).`,
      });
    } else if (count > 1) {
      issues.push({
        path: ["scores"],
        message: `duplicate score for route "${routeId}" (found ${count} entries, expected 1).`,
      });
    }
  }

  if (issues.length > 0) {
    throw new WorkflowValidationError(
      `Route score coverage validation failed: ${issues.length} issue(s) found.`,
      issues,
    );
  }
}
