// Server-side only. Do not import in client components or pages.
// Validates that a human-selected route ID exists in the provided routes array.
// Throws WorkflowValidationError if the ID is missing or unrecognized.

import type { CampaignRoute } from "@/lib/schemas/campaign";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

export function validateSelectedRoute(input: {
  selectedRouteId: string;
  routes: CampaignRoute[];
}): void {
  const { selectedRouteId, routes } = input;

  const exists = routes.some((route) => route.id === selectedRouteId);
  if (!exists) {
    const knownIds = routes.map((r) => r.id).join(", ");
    throw new WorkflowValidationError(
      `Selected route "${selectedRouteId}" does not exist. Known route IDs: ${knownIds}`,
      [{ path: ["selectedRouteId"], message: `Route ID "${selectedRouteId}" not found in routes.` }],
    );
  }
}
