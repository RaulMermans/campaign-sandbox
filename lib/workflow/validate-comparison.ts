// Deterministic cross-reference validator for route comparison output.
// Called after compareRoutes to enforce full route coverage and uniqueness.
// Throws WorkflowValidationError when comparison fails cross-reference rules.
// No LLM calls. No side effects.

import type { CampaignRoute, RouteComparisonMatrix } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export interface ValidateComparisonCoverageInput {
  comparison: RouteComparisonMatrix;
  routes: CampaignRoute[];
}

/**
 * Validate that comparison rows cover every route exactly once.
 *
 * Rules:
 * 1. Every comparison row routeId must reference a known route ID.
 * 2. Every route must have exactly one comparison row.
 * 3. No duplicate route IDs in rows.
 * 4. recommendedRouteId must reference a known route.
 *
 * Throws WorkflowValidationError with a structured issues list if any rule fails.
 * Returns void on success.
 */
export function validateComparisonCoverage(
  input: ValidateComparisonCoverageInput,
): void {
  const { comparison, routes } = input;

  const routeIds = new Set(routes.map((r) => r.id));
  const issues: Array<{ path: Array<string | number>; message: string }> = [];
  const seenRouteIds = new Map<string, number>();

  for (const row of comparison.rows) {
    const { routeId } = row;

    if (!routeIds.has(routeId)) {
      issues.push({
        path: ["comparison", "rows"],
        message: `comparison row references unknown routeId "${routeId}". Valid route IDs: ${[...routeIds].join(", ")}.`,
      });
    }

    seenRouteIds.set(routeId, (seenRouteIds.get(routeId) ?? 0) + 1);
  }

  for (const routeId of routeIds) {
    const count = seenRouteIds.get(routeId) ?? 0;

    if (count === 0) {
      issues.push({
        path: ["comparison", "rows"],
        message: `missing comparison row for route "${routeId}". Expected ${routeIds.size} rows total (one per route).`,
      });
    } else if (count > 1) {
      issues.push({
        path: ["comparison", "rows"],
        message: `duplicate comparison row for route "${routeId}" (found ${count} entries, expected 1).`,
      });
    }
  }

  if (!routeIds.has(comparison.recommendedRouteId)) {
    issues.push({
      path: ["comparison", "recommendedRouteId"],
      message: `recommendedRouteId "${comparison.recommendedRouteId}" does not reference a known route ID.`,
    });
  }

  if (issues.length > 0) {
    throw new WorkflowValidationError(
      `Comparison coverage validation failed: ${issues.length} issue(s) found.`,
      issues,
    );
  }
}
