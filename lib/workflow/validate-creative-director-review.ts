// Deterministic cross-reference validator for creative director review coverage.
// Called after Zod schema validation to enforce full route coverage.
// Throws WorkflowValidationError when review output passes Zod but fails
// cross-reference rules (unknown IDs, missing routes, duplicate entries).
// No LLM calls. No side effects.

import type { CampaignRoute, CreativeDirectorReview } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export interface ValidateCreativeDirectorReviewCoverageInput {
  review: CreativeDirectorReview;
  routes: CampaignRoute[];
}

/**
 * Validate that creative director routeReviews cover every route exactly once
 * and that cross-references (strongestRouteId, routesToAvoidOrMerge) point to
 * known route IDs.
 *
 * Throws WorkflowValidationError with a structured issues list if any rule fails.
 * Returns void on success.
 */
export function validateCreativeDirectorReviewCoverage(
  input: ValidateCreativeDirectorReviewCoverageInput,
): void {
  const { review, routes } = input;

  const routeIds = new Set(routes.map((r) => r.id));
  const issues: Array<{ path: Array<string | number>; message: string }> = [];
  const seenRouteIds = new Map<string, number>();

  for (const routeReview of review.routeReviews) {
    const { routeId } = routeReview;

    if (!routeIds.has(routeId)) {
      issues.push({
        path: ["review", "routeReviews"],
        message: `routeReview references unknown routeId "${routeId}". Valid route IDs: ${[...routeIds].join(", ")}.`,
      });
    }

    seenRouteIds.set(routeId, (seenRouteIds.get(routeId) ?? 0) + 1);
  }

  for (const routeId of routeIds) {
    const count = seenRouteIds.get(routeId) ?? 0;

    if (count === 0) {
      issues.push({
        path: ["review", "routeReviews"],
        message: `missing creative director review for route "${routeId}". Expected ${routeIds.size} routeReviews total (one per route).`,
      });
    } else if (count > 1) {
      issues.push({
        path: ["review", "routeReviews"],
        message: `duplicate creative director review for route "${routeId}" (found ${count} entries, expected 1).`,
      });
    }
  }

  if (!routeIds.has(review.strongestRouteId)) {
    issues.push({
      path: ["review", "strongestRouteId"],
      message: `strongestRouteId "${review.strongestRouteId}" does not match any known route ID.`,
    });
  }

  for (const entry of review.routesToAvoidOrMerge) {
    if (!routeIds.has(entry.routeId)) {
      issues.push({
        path: ["review", "routesToAvoidOrMerge"],
        message: `routesToAvoidOrMerge references unknown routeId "${entry.routeId}".`,
      });
    }
  }

  if (issues.length > 0) {
    throw new WorkflowValidationError(
      `Creative director review coverage validation failed: ${issues.length} issue(s) found.`,
      issues,
    );
  }
}
