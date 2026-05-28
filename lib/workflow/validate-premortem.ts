// Deterministic cross-reference validator for premortem review coverage.
// Called after Zod schema validation to enforce full route coverage.
// Throws WorkflowValidationError when review output passes Zod but fails
// cross-reference rules (unknown IDs, missing routes, duplicate entries).
// No LLM calls. No side effects.

import type { CampaignRoute, PremortemReview } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export interface ValidatePremortemCoverageInput {
  review: PremortemReview;
  routes: CampaignRoute[];
}

/**
 * Validate that premortem routeRisks cover every route exactly once.
 *
 * Rules:
 * 1. Every routeRisk.routeId must match a known route ID.
 * 2. Every route must have exactly one risk review entry.
 * 3. No duplicate routeRisk entries.
 *    If there are R routes, exactly R routeRisks are expected.
 *
 * Throws WorkflowValidationError with a structured issues list if any rule fails.
 * Returns void on success.
 */
export function validatePremortemCoverage(
  input: ValidatePremortemCoverageInput,
): void {
  const { review, routes } = input;

  const routeIds = new Set(routes.map((r) => r.id));
  const issues: Array<{ path: Array<string | number>; message: string }> = [];
  const seenRouteIds = new Map<string, number>();

  for (const routeRisk of review.routeRisks) {
    const { routeId } = routeRisk;

    if (!routeIds.has(routeId)) {
      issues.push({
        path: ["review", "routeRisks"],
        message: `routeRisk references unknown routeId "${routeId}". Valid route IDs: ${[...routeIds].join(", ")}.`,
      });
    }

    seenRouteIds.set(routeId, (seenRouteIds.get(routeId) ?? 0) + 1);
  }

  for (const routeId of routeIds) {
    const count = seenRouteIds.get(routeId) ?? 0;

    if (count === 0) {
      issues.push({
        path: ["review", "routeRisks"],
        message: `missing risk review for route "${routeId}". Expected ${routeIds.size} routeRisks total (one per route).`,
      });
    } else if (count > 1) {
      issues.push({
        path: ["review", "routeRisks"],
        message: `duplicate risk review for route "${routeId}" (found ${count} entries, expected 1).`,
      });
    }
  }

  if (issues.length > 0) {
    throw new WorkflowValidationError(
      `Premortem coverage validation failed: ${issues.length} issue(s) found.`,
      issues,
    );
  }
}
