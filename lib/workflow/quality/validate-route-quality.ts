// Deterministic route quality validator.
// Flags generic names, vague outputs, and unsupported proof claims.
// No LLM calls.

import type { CampaignRoute } from "@/lib/schemas/campaign";

export type RouteQualityIssue = {
  routeId?: string;
  field: "name" | "idea" | "visualWorld" | "proofMechanism" | "killerLine" | "failureMode";
  severity: "warning" | "error";
  message: string;
};

const FORBIDDEN_NAME_PATTERNS = [
  "effortless elegance",
  "urban escape",
  "calm curation",
  "simple choice",
  "tasteful evening",
  "premium ritual",
  "elevated moment",
  "elevated evening",
  "craft movement",
  "modern ritual",
  "decisions made simple",
  "calm and considered",
  "refined living",
  "everyday luxury",
  "quiet luxury",
  "the elevated edit",
];

const FAKE_PROOF_PATTERNS = [
  /\breal customer testimonials?\b/i,
  /\bsatisfied subscriber quotes?\b/i,
  /\buser.generated content\b/i,
  /\bcustomer names and photos\b/i,
  /\breal customers?\b/i,
  /\bverified customer reviews?\b/i,
  /\bgenuine customer stories\b/i,
];

const SAFE_PROOF_PATTERNS = [
  /\bif available\b/i,
  /\btestimonial.style\b/i,
  /\bscenario.based\b/i,
  /\bconceptual\b/i,
  /\bdemo\b/i,
  /\bsample\b/i,
];

function isGenericName(name: string): boolean {
  const lower = name.toLowerCase().trim();

  // Check exact forbidden patterns
  if (FORBIDDEN_NAME_PATTERNS.some((p) => lower === p || lower.includes(p))) {
    return true;
  }

  // Check adjective + category noun pattern (2-word names only)
  const words = lower.split(/\s+/);
  if (words.length === 2) {
    const genericAdjectives = [
      "effortless",
      "elegant",
      "elevated",
      "premium",
      "modern",
      "refined",
      "calm",
      "quiet",
      "simple",
      "tasteful",
      "pure",
      "clean",
      "fresh",
      "bold",
      "smart",
      "sleek",
    ];
    const genericNouns = [
      "elegance",
      "luxury",
      "style",
      "living",
      "escape",
      "ritual",
      "moment",
      "choice",
      "edit",
      "journey",
      "movement",
      "collection",
      "curation",
      "evening",
      "morning",
    ];
    if (genericAdjectives.includes(words[0]) && genericNouns.includes(words[1])) {
      return true;
    }
  }

  return false;
}

function isVagueKillerLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  const vaguePatterns = [
    "make every moment count",
    "life is better",
    "experience the difference",
    "quality you can trust",
    "because you deserve",
    "feel the difference",
    "live better",
    "be more",
    "discover",
    "unleash",
    "elevate your",
    "your best self",
    "transform your",
    "inspired by",
    "designed for life",
    "made for you",
  ];
  return vaguePatterns.some((p) => lower.includes(p));
}

function hasInsufficientVisualWorld(visualWorld: string[]): boolean {
  // Need at least 2 concrete sensory/production details
  const concreteKeywords = [
    "light",
    "shadow",
    "color",
    "texture",
    "shot",
    "photograph",
    "film",
    "still",
    "portrait",
    "video",
    "interior",
    "exterior",
    "surface",
    "hands",
    "face",
    "street",
    "studio",
    "window",
    "concrete",
    "tile",
    "close",
    "wide",
    "tight",
    "warm",
    "cool",
    "grain",
    "soft",
    "sharp",
    "detail",
    "pace",
    "move",
    "silhouette",
    "overhead",
    "diptych",
    "split",
    "format",
    "angle",
    "frame",
    "candid",
    "editorial",
    "flat lay",
    "walkthrough",
    "b-roll",
    "cutaway",
    "extreme",
    "medium",
    "low",
    "natural",
    "artificial",
    "ambient",
  ];

  const concreteEntries = visualWorld.filter((entry) => {
    const lower = entry.toLowerCase();
    return concreteKeywords.some((k) => lower.includes(k));
  });

  return concreteEntries.length < 2;
}

function hasFakeProofClaim(proofMechanism: string): boolean {
  const hasFake = FAKE_PROOF_PATTERNS.some((p) => p.test(proofMechanism));
  if (!hasFake) return false;
  // Allow if qualified with "if available" or labeled as testimonial-style
  const hasSafeQualifier = SAFE_PROOF_PATTERNS.some((p) => p.test(proofMechanism));
  return !hasSafeQualifier;
}

function isVagueFailureMode(failureMode: string): boolean {
  const lower = failureMode.toLowerCase().trim();
  const vaguePatterns = ["may not resonate", "might not work", "could fail", "may underperform"];
  // Vague if it uses these but doesn't explain why
  for (const vague of vaguePatterns) {
    if (lower.includes(vague) && lower.length < 80) return true;
  }
  return false;
}

export function validateRouteQuality(routes: CampaignRoute[]): RouteQualityIssue[] {
  const issues: RouteQualityIssue[] = [];

  for (const route of routes) {
    if (isGenericName(route.name)) {
      issues.push({
        routeId: route.id,
        field: "name",
        severity: "error",
        message: `Route name "${route.name}" is too generic or matches a known forbidden pattern. Use a specific, ownable name rooted in the brief.`,
      });
    }

    if (isVagueKillerLine(route.killerLine)) {
      issues.push({
        routeId: route.id,
        field: "killerLine",
        severity: "error",
        message: `Killer line "${route.killerLine}" is too generic or motivational. It must be specific, concrete, and rooted in the brand's unique tension.`,
      });
    }

    if (hasInsufficientVisualWorld(route.visualWorld)) {
      issues.push({
        routeId: route.id,
        field: "visualWorld",
        severity: "error",
        message: `Visual world for "${route.name}" lacks concrete sensory or production detail. At least 2 entries must describe specific shots, surfaces, light conditions, or production formats.`,
      });
    }

    if (hasFakeProofClaim(route.proofMechanism)) {
      issues.push({
        routeId: route.id,
        field: "proofMechanism",
        severity: "error",
        message: `Proof mechanism implies real customer testimonials or UGC without a brief-provided source. Use "testimonial-style creative" or "customer proof if available" instead.`,
      });
    }

    if (isVagueFailureMode(route.failureMode)) {
      issues.push({
        routeId: route.id,
        field: "failureMode",
        severity: "warning",
        message: `Failure mode for "${route.name}" is too vague — state the specific reason the route would fail, not just that it "may not resonate."`,
      });
    }
  }

  return issues;
}

export function hasBlockingRouteQualityIssues(issues: RouteQualityIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
