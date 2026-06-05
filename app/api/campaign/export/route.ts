export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { campaignExportInputSchema } from "@/lib/schemas/campaign";
import { buildCampaignReport } from "@/lib/export/build-campaign-report";
import { renderMarkdownReport } from "@/lib/export/render-markdown-report";
import { renderHtmlReport } from "@/lib/export/render-html-report";

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
  const report = buildCampaignReport(input);

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
