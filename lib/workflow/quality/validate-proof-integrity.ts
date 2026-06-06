// Deterministic proof-integrity guardrail.
// Flags unsupported claims for customer testimonials, UGC, or real customer proof
// unless the brief explicitly provides that evidence.
// No LLM calls.

import type {
  NormalizedCampaignBrief,
  CampaignRoute,
  CampaignExecutionPlan,
} from "@/lib/schemas/campaign";

export type ProofIntegrityIssue = {
  field: string;
  severity: "warning" | "error";
  message: string;
};

const UNSUPPORTED_PROOF_PHRASES = [
  /\breal customer testimonials?\b/i,
  /\bsatisfied subscriber quotes?\b/i,
  /\buser.generated content\b/i,
  /\bcustomer names and photos\b/i,
  /\bgenuine customer stories\b/i,
  /\bverified testimonials?\b/i,
  /\bactual customer reviews?\b/i,
  /\breal customers?\b/i,
  /\bcustomer quotes?\b/i,
];

const SAFE_QUALIFIERS = [
  /\bif available\b/i,
  /\btestimonial.style\b/i,
  /\bscenario.based\b/i,
  /\bconceptual\b/i,
  /\bif provided\b/i,
  /\bwhen available\b/i,
];

const BRIEF_PROOF_SIGNALS = [
  "testimonial",
  "case study",
  "customer review",
  "ugc",
  "user-generated",
  "customer stories",
  "customer photos",
  "customer names",
  "real users",
  "verified customers",
];

function briefProvidesProof(brief: NormalizedCampaignBrief): boolean {
  const briefText = [
    brief.brandDescription,
    ...(brief.objectives ?? []),
    ...(brief.constraints ?? []),
    ...(brief.openQuestions ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return BRIEF_PROOF_SIGNALS.some((signal) => briefText.includes(signal));
}

function checkText(text: string, fieldName: string): ProofIntegrityIssue[] {
  const issues: ProofIntegrityIssue[] = [];

  for (const pattern of UNSUPPORTED_PROOF_PHRASES) {
    if (pattern.test(text)) {
      // Check for safe qualifier in the same sentence/nearby text
      const hasSafeQualifier = SAFE_QUALIFIERS.some((q) => q.test(text));
      if (!hasSafeQualifier) {
        issues.push({
          field: fieldName,
          severity: "error",
          message: `Field "${fieldName}" implies real customer proof ("${text.match(pattern)?.[0] ?? ""}") without brief-provided evidence. Use "testimonial-style creative" or add "if available."`,
        });
        break; // one issue per field
      }
    }
  }

  return issues;
}

export function validateProofIntegrity(input: {
  normalizedBrief: NormalizedCampaignBrief;
  routes?: CampaignRoute[];
  executionPlan?: CampaignExecutionPlan;
}): ProofIntegrityIssue[] {
  const { normalizedBrief, routes, executionPlan } = input;
  const briefHasProof = briefProvidesProof(normalizedBrief);

  // If the brief explicitly provides proof, no issues
  if (briefHasProof) return [];

  const issues: ProofIntegrityIssue[] = [];

  // Check routes
  for (const route of routes ?? []) {
    issues.push(
      ...checkText(route.proofMechanism, `routes[${route.id}].proofMechanism`),
    );
    for (const idea of route.activationIdeas) {
      issues.push(...checkText(idea, `routes[${route.id}].activationIdeas`));
    }
    for (const asset of route.assetIdeas) {
      issues.push(...checkText(asset, `routes[${route.id}].assetIdeas`));
    }
  }

  // Check execution plan
  if (executionPlan) {
    issues.push(
      ...checkText(executionPlan.strategicSummary, "executionPlan.strategicSummary"),
    );

    for (const phase of executionPlan.launchPhases) {
      for (const action of phase.keyActions) {
        issues.push(...checkText(action, `executionPlan.launchPhases[${phase.phase}].keyActions`));
      }
      for (const deliverable of phase.deliverables) {
        issues.push(
          ...checkText(deliverable, `executionPlan.launchPhases[${phase.phase}].deliverables`),
        );
      }
    }

    for (const channel of executionPlan.channelPlan) {
      for (const asset of channel.recommendedAssets) {
        issues.push(...checkText(asset, `executionPlan.channelPlan[${channel.channel}].assets`));
      }
    }

    for (const asset of executionPlan.assetList) {
      issues.push(...checkText(asset, "executionPlan.assetList"));
    }
  }

  return issues;
}
