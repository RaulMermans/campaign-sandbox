// Server-side only. Do not import in client components or pages.
// Generates 3–5 campaign routes from a validated NormalizedCampaignBrief and StrategicTension.
// Uses the mock provider path or OpenAI, never returning unvalidated model output.

import {
  campaignRoutesOutputSchema,
  type CampaignRoute,
  type NormalizedCampaignBrief,
  type StrategicTension,
} from "@/lib/schemas/campaign";
import type { TraceEvent } from "@/lib/schemas/trace";
import { createTraceEvent } from "@/lib/traces/trace-events";
import { loadPrompt } from "@/lib/prompts/load-prompt";
import { env } from "@/lib/env";
import { generateJson } from "@/lib/llm/generate-json";
import { LlmJsonParseError, LlmSchemaValidationError } from "@/lib/llm/errors";
import { campaignRoutes as MOCK_CAMPAIGN_ROUTES } from "@/lib/workflow/mock-campaign-run";
import {
  validateRouteQuality,
  hasBlockingRouteQualityIssues,
  type RouteQualityIssue,
} from "@/lib/workflow/quality/validate-route-quality";
import {
  validateProofIntegrity,
  hasBlockingProofIntegrityIssues,
  type ProofIntegrityIssue,
} from "@/lib/workflow/quality/validate-proof-integrity";
import { WorkflowValidationError } from "@/lib/workflow/workflow-errors";

const PROMPT_FILE = "generate_campaign_routes.md";
const PROMPT_VERSION = "generate_campaign_routes.v1";
const DEFAULT_RUN_ID = "stage-only";
const OPENAI_TIMEOUT_MS = 75_000;

export interface GenerateCampaignRoutesResult {
  routes: CampaignRoute[];
  traceEvent: TraceEvent;
  qualityWarnings?: RouteQualityIssue[];
}

// --- Mock path ---

function generateRoutesMock(
  normalizedBrief: NormalizedCampaignBrief,
  runId: string,
): GenerateCampaignRoutesResult {
  const traceEvent = createTraceEvent({
    runId,
    stageId: "generate_campaign_routes",
    type: "stage.completed",
    status: "completed",
    message: "Campaign routes generated using mock provider.",
    outputSchema: "CampaignRoute[]",
    provider: "mock",
    model: "mock-route-generator",
    promptVersion: PROMPT_VERSION,
    costUsd: 0,
    durationMs: 0,
  });

  // Validate the fixed mock against the wrapper schema so drift is caught immediately.
  const parsed = campaignRoutesOutputSchema.parse({ routes: MOCK_CAMPAIGN_ROUTES });

  const proofIssues = validateProofIntegrity({ normalizedBrief, routes: parsed.routes });
  if (hasBlockingProofIntegrityIssues(proofIssues)) {
    throw new WorkflowValidationError(
      "Mock campaign routes contain unsupported customer proof language.",
      proofIssues
        .filter((i) => i.severity === "error")
        .map((i) => ({ path: [i.field], message: i.message })),
    );
  }

  return { routes: parsed.routes, traceEvent };
}

// --- OpenAI path ---

function buildRepairPrompt(
  basePrompt: string,
  issues: RouteQualityIssue[],
  proofIssues: ProofIntegrityIssue[] = [],
): string {
  const sections: string[] = [basePrompt, "", "## QUALITY REPAIR REQUIRED", ""];

  if (issues.length > 0) {
    sections.push(
      "The previous output failed quality validation. Please regenerate routes fixing these issues:",
      "",
      issues.map((i) => `- [${i.field}] ${i.message}`).join("\n"),
      "",
    );
  }

  if (proofIssues.length > 0) {
    sections.push(
      "The previous output contained unsupported customer proof language. Please regenerate routes fixing these issues:",
      "",
      proofIssues.map((i) => `- [${i.field}] ${i.message}`).join("\n"),
      "",
    );
  }

  sections.push(
    "Rules:",
    "- Route names must be specific and ownable, not generic adjective+noun combinations.",
    "- Avoid overused category language in names and killer lines — words like 'elevated', 'effortless',",
    "  'ritual', 'reset', 'curation', 'essence', 'journey', 'unlock', 'transform', 'reimagine',",
    "  'experience', 'premium', and 'urban escape' could describe almost any brand. Replace them with",
    "  vocabulary anchored in this specific brief's brand voice, audience tension, or product details.",
    "- Killer lines must be concrete and rooted in the brand tension, not motivational platitudes.",
    "- Visual world must include at least 2 entries with concrete sensory or production detail.",
    "- Proof mechanisms must not imply real customer testimonials unless the brief explicitly provides them.",
    "- Use 'testimonial-style creative' or 'customer proof if available' for conceptual proof assets.",
    "- Do NOT use 'survey-backed', 'proven', 'validated by customers', or 'endorsements confirming benefits'",
    "  unless the brief provides that evidence. Do NOT state outcome claims like 'no crash', 'clear mental",
    "  blocks', or 'helps you regain your flow' as settled facts — reframe around the perceived experience.",
  );

  return sections.join("\n");
}

async function generateRoutesWithOpenAI(
  normalizedBrief: NormalizedCampaignBrief,
  strategicTension: StrategicTension,
  runId: string,
): Promise<GenerateCampaignRoutesResult> {
  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const basePrompt = [
    promptTemplate.trim(),
    "",
    "## NORMALIZED BRIEF",
    "",
    JSON.stringify(normalizedBrief, null, 2),
    "",
    "## STRATEGIC TENSION",
    "",
    JSON.stringify(strategicTension, null, 2),
  ].join("\n");

  const startMs = Date.now();
  let lastError: unknown;
  let qualityWarnings: RouteQualityIssue[] | undefined;

  // Up to 3 attempts: 1 normal + 1 schema retry + 1 quality/proof repair retry
  let prompt = basePrompt;
  let repairRetryDone = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generateJson({
        prompt,
        schema: campaignRoutesOutputSchema,
        model: env.openaiModel,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });

      const routes = result.data.routes;

      // Quality gate: validate routes on first valid schema result
      const qualityIssues = validateRouteQuality(routes);
      const hasBlockingQuality = hasBlockingRouteQualityIssues(qualityIssues);

      const proofIssues = validateProofIntegrity({ normalizedBrief, routes });
      const hasBlockingProof = hasBlockingProofIntegrityIssues(proofIssues);

      if ((hasBlockingQuality || hasBlockingProof) && !repairRetryDone) {
        // Retry once with a repair prompt
        repairRetryDone = true;
        prompt = buildRepairPrompt(basePrompt, qualityIssues, proofIssues);
        continue;
      }

      if (hasBlockingProof) {
        throw new WorkflowValidationError(
          "Campaign routes contain unsupported customer proof language after retry.",
          proofIssues
            .filter((i) => i.severity === "error")
            .map((i) => ({ path: [i.field], message: i.message })),
        );
      }

      const durationMs = Date.now() - startMs;
      if (qualityIssues.length > 0) {
        qualityWarnings = qualityIssues;
      }

      const traceEvent = createTraceEvent({
        runId,
        stageId: "generate_campaign_routes",
        type: "stage.completed",
        status: "completed",
        message:
          attempt === 1
            ? "Campaign routes generated via OpenAI."
            : repairRetryDone && !hasBlockingQuality && !hasBlockingProof
              ? "Campaign routes generated via OpenAI after quality repair retry."
              : "Campaign routes generated via OpenAI after one retry.",
        outputSchema: "CampaignRoute[]",
        provider: "openai",
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
      });

      return { routes, traceEvent, qualityWarnings };
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof LlmJsonParseError || err instanceof LlmSchemaValidationError;
      // Only retry schema/parse errors once; don't add extra retries beyond attempt 3
      if (!isRetryable || attempt >= 3) {
        break;
      }
      // Retry once on JSON or schema failure; do not retry on provider/network errors.
    }
  }

  throw lastError;
}

// --- Public API ---

/**
 * Generate 3–5 campaign routes from a validated NormalizedCampaignBrief and StrategicTension.
 *
 * - In mock mode: returns the NODO demo routes immediately.
 * - In openai mode: loads the prompt file, injects both inputs, calls the model,
 *   validates with Zod, retries once on parse/schema failure.
 *
 * Throws typed errors (LlmProviderError, LlmJsonParseError, LlmSchemaValidationError) on failure.
 * Never returns unvalidated output.
 *
 * @param input - Validated normalized brief, strategic tension, and optional run ID.
 */
export async function generateCampaignRoutesStage(input: {
  normalizedBrief: NormalizedCampaignBrief;
  strategicTension: StrategicTension;
  runId?: string;
}): Promise<GenerateCampaignRoutesResult> {
  const runId = input.runId ?? DEFAULT_RUN_ID;
  if (env.provider === "mock") {
    return generateRoutesMock(input.normalizedBrief, runId);
  }
  return generateRoutesWithOpenAI(input.normalizedBrief, input.strategicTension, runId);
}
