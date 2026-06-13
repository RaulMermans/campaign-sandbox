// Deterministic proof-integrity guardrail.
// Flags unsupported claims for customer testimonials, UGC, or real customer proof
// unless the brief explicitly provides that evidence.
// No LLM calls.

import type {
  NormalizedCampaignBrief,
  CampaignRoute,
  CampaignExecutionPlan,
  PremortemReview,
  CreativeDirectorReview,
} from "@/lib/schemas/campaign";

export type ProofIntegrityIssue = {
  field: string;
  severity: "warning" | "error";
  message: string;
};

const UNSUPPORTED_CUSTOMER_PROOF_PHRASES = [
  /\breal customer testimonials?\b/i,
  /\bsatisfied subscriber quotes?\b/i,
  /\buser.generated content\b/i,
  /\bcustomer names and photos\b/i,
  /\bgenuine customer stories\b/i,
  /\bverified testimonials?\b/i,
  /\bverified customer reviews?\b/i,
  /\bactual customer reviews?\b/i,
  /\breal customers?\b/i,
  /\bcustomer quotes?\b/i,
  /\bsurvey.backed\b/i,
  /\bvalidated by customers?\b/i,
  /\bendorsements? confirming\b/i,
];

// Phrases that imply a validated outcome or effect (not customer proof
// specifically) without supporting evidence — e.g. "no crash," "proven,"
// "clear mental blocks." These read as settled facts rather than planning
// hypotheses and need the same guardrail.
const UNSUPPORTED_EFFICACY_PHRASES = [
  /\bproven\b/i,
  /\bno crash\b/i,
  /\bclear(?:s|ed|ing)? mental blocks?\b/i,
  /\bregain (?:your |their )?flow\b/i,
];

const SAFE_QUALIFIERS = [
  /\bif available\b/i,
  /\btestimonial.style\b/i,
  /\bscenario.based\b/i,
  /\bconceptual\b/i,
  /\bif provided\b/i,
  /\bwhen available\b/i,
  /\bif contracted and approved\b/i,
  /\bclaims? requiring substantiation\b/i,
  /\bperceived focus and refreshment\b/i,
  /\bafternoon reset ritual\b/i,
  // Safety-caveat framing — e.g. "must not be presented as real customer
  // research" — warns against treating synthetic data as real evidence. This
  // is the opposite of an unsupported proof claim and must not be flagged.
  /\breal (?:customer )?research\b/i,
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
  const hasSafeQualifier = SAFE_QUALIFIERS.some((q) => q.test(text));
  if (hasSafeQualifier) return issues;

  for (const pattern of UNSUPPORTED_CUSTOMER_PROOF_PHRASES) {
    const match = text.match(pattern);
    if (match) {
      issues.push({
        field: fieldName,
        severity: "error",
        message: `Field "${fieldName}" implies real customer proof ("${match[0]}") without brief-provided evidence. Use "testimonial-style creative," "scenario-based proof," or "customer proof if available" instead.`,
      });
      return issues; // one issue per field
    }
  }

  for (const pattern of UNSUPPORTED_EFFICACY_PHRASES) {
    const match = text.match(pattern);
    if (match) {
      issues.push({
        field: fieldName,
        severity: "error",
        message: `Field "${fieldName}" implies a validated outcome ("${match[0]}") without supporting evidence. Reframe around the perceived benefit (e.g. "positioned around perceived focus and refreshment") or mark it as a "claim requiring substantiation before publication."`,
      });
      return issues; // one issue per field
    }
  }

  return issues;
}

export function hasBlockingProofIntegrityIssues(issues: ProofIntegrityIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export function validateProofIntegrity(input: {
  normalizedBrief: NormalizedCampaignBrief;
  routes?: CampaignRoute[];
  executionPlan?: CampaignExecutionPlan;
  premortemReview?: PremortemReview;
  creativeDirectorReview?: CreativeDirectorReview;
}): ProofIntegrityIssue[] {
  const { normalizedBrief, routes, executionPlan, premortemReview, creativeDirectorReview } = input;
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

  // Check pre-mortem review — risk and mitigation language can just as easily
  // assert unsupported customer proof exists ("mitigate by featuring real
  // customer testimonials") as the routes or execution plan can.
  if (premortemReview) {
    issues.push(...checkText(premortemReview.summary, "premortemReview.summary"));

    for (const entry of premortemReview.routeRisks) {
      for (const risk of entry.risks) {
        issues.push(...checkText(risk, `premortemReview.routeRisks[${entry.routeId}].risks`));
      }
      for (const mitigation of entry.mitigations) {
        issues.push(
          ...checkText(mitigation, `premortemReview.routeRisks[${entry.routeId}].mitigations`),
        );
      }
    }

    for (const risk of premortemReview.overallRisks) {
      issues.push(...checkText(risk, "premortemReview.overallRisks"));
    }
    for (const warning of premortemReview.decisionWarnings) {
      issues.push(...checkText(warning, "premortemReview.decisionWarnings"));
    }
    for (const failure of premortemReview.topFailureRisks) {
      issues.push(...checkText(failure.risk, "premortemReview.topFailureRisks[].risk"));
      issues.push(
        ...checkText(failure.whyItHappens, "premortemReview.topFailureRisks[].whyItHappens"),
      );
      issues.push(
        ...checkText(failure.earlyWarningSign, "premortemReview.topFailureRisks[].earlyWarningSign"),
      );
      issues.push(
        ...checkText(failure.mitigation, "premortemReview.topFailureRisks[].mitigation"),
      );
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
      if (channel.notes) {
        issues.push(...checkText(channel.notes, `executionPlan.channelPlan[${channel.channel}].notes`));
      }
    }

    for (const asset of executionPlan.assetList) {
      issues.push(...checkText(asset, "executionPlan.assetList"));
    }

    for (const example of executionPlan.copyExamples) {
      issues.push(...checkText(example, "executionPlan.copyExamples"));
    }

    for (const entry of executionPlan.measurementPlan) {
      issues.push(
        ...checkText(entry.purpose, `executionPlan.measurementPlan[${entry.metric}].purpose`),
      );
    }

    for (const entry of executionPlan.risksAndMitigations) {
      issues.push(
        ...checkText(entry.mitigation, "executionPlan.risksAndMitigations[].mitigation"),
      );
    }

    for (const action of executionPlan.nextActions) {
      issues.push(...checkText(action, "executionPlan.nextActions"));
    }

    // Production-specific sections
    issues.push(...checkText(executionPlan.heroVisualSystem, "executionPlan.heroVisualSystem"));

    for (const shot of executionPlan.shootList) {
      issues.push(...checkText(shot, "executionPlan.shootList"));
    }

    for (const headline of executionPlan.oohHeadlines) {
      issues.push(...checkText(headline, "executionPlan.oohHeadlines"));
    }

    for (const hook of executionPlan.paidSocialHooks) {
      issues.push(...checkText(hook, "executionPlan.paidSocialHooks"));
    }

    for (const block of executionPlan.landingPageBlocks) {
      issues.push(
        ...checkText(block.content, `executionPlan.landingPageBlocks[${block.block}].content`),
      );
    }

    // legalSubstantiationChecklist is intentionally not checked here — it exists
    // to name claims that require substantiation, so it will legitimately quote
    // the same unsupported phrases the rest of the plan must avoid.
  }

  // Check creative director review — sharpening suggestions, killer lines, and
  // notes can just as easily propose unsupported customer proof ("feature real
  // customer testimonials to feel more ownable") as routes or the execution
  // plan can.
  if (creativeDirectorReview) {
    issues.push(...checkText(creativeDirectorReview.overallVerdict, "creativeDirectorReview.overallVerdict"));
    issues.push(
      ...checkText(creativeDirectorReview.finalRecommendation, "creativeDirectorReview.finalRecommendation"),
    );

    for (const recommendation of creativeDirectorReview.crossRouteRecommendations) {
      issues.push(
        ...checkText(recommendation, "creativeDirectorReview.crossRouteRecommendations"),
      );
    }

    for (const entry of creativeDirectorReview.routesToAvoidOrMerge) {
      issues.push(
        ...checkText(entry.reason, `creativeDirectorReview.routesToAvoidOrMerge[${entry.routeId}].reason`),
      );
    }

    for (const routeReview of creativeDirectorReview.routeReviews) {
      issues.push(...checkText(routeReview.why, `creativeDirectorReview.routeReviews[${routeReview.routeId}].why`));

      for (const item of routeReview.whatFeelsOwnable) {
        issues.push(
          ...checkText(item, `creativeDirectorReview.routeReviews[${routeReview.routeId}].whatFeelsOwnable`),
        );
      }
      for (const line of routeReview.sharperKillerLines) {
        issues.push(
          ...checkText(line, `creativeDirectorReview.routeReviews[${routeReview.routeId}].sharperKillerLines`),
        );
      }
      for (const note of routeReview.creativeDirectorNotes) {
        issues.push(
          ...checkText(note, `creativeDirectorReview.routeReviews[${routeReview.routeId}].creativeDirectorNotes`),
        );
      }
    }
  }

  return issues;
}
