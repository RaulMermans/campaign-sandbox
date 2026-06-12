export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { campaignExportInputSchema } from "@/lib/schemas/campaign";
import { buildCampaignReport } from "@/lib/export/build-campaign-report";
import { renderMarkdownReport } from "@/lib/export/render-markdown-report";
import { renderHtmlReport } from "@/lib/export/render-html-report";
import { buildRouteDeckPptx } from "@/lib/export/build-route-deck-pptx";
import {
  validateProofIntegrity,
  hasBlockingProofIntegrityIssues,
} from "@/lib/workflow/quality/validate-proof-integrity";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = campaignExportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid export input.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const input = parsed.data;

  // Final guardrail: never hand a human-facing artifact unsupported customer
  // proof claims, even if they slipped through upstream stage-level checks
  // (e.g. via a manually-edited or older saved run).
  const proofIssues = validateProofIntegrity({
    normalizedBrief: input.normalizedBrief,
    routes: input.routes,
    executionPlan: input.executionPlan,
    premortemReview: input.premortemReview,
    creativeDirectorReview: input.creativeDirectorReview,
  });
  if (hasBlockingProofIntegrityIssues(proofIssues)) {
    return NextResponse.json(
      {
        error:
          "Export blocked: this run contains unsupported customer proof language (e.g. \"real customer testimonials\") that the brief does not substantiate.",
        issues: proofIssues
          .filter((i) => i.severity === "error")
          .map((i) => ({ path: i.field, message: i.message })),
      },
      { status: 422 },
    );
  }

  const report = buildCampaignReport(input);

  if (input.format === "pptx") {
    const pptx = await buildRouteDeckPptx(report);
    return new Response(pptx as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="campaign-route-deck.pptx"',
      },
    });
  }

  if (input.format === "html") {
    const html = renderHtmlReport(report);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'attachment; filename="campaign-strategy-report.html"',
      },
    });
  }

  const markdown = renderMarkdownReport(report);
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="campaign-strategy-report.md"',
    },
  });
}
