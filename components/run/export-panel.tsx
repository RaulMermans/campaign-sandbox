"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignExportInput } from "@/lib/schemas/campaign";

interface ExportPanelProps {
  exportInput: Omit<CampaignExportInput, "format">;
}

export function ExportPanel({ exportInput }: ExportPanelProps) {
  const [isExportingMd, setIsExportingMd] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExporting = isExportingMd || isExportingHtml || isExportingPptx;

  async function handleExport(format: "markdown" | "html" | "pptx") {
    const setter =
      format === "markdown" ? setIsExportingMd : format === "html" ? setIsExportingHtml : setIsExportingPptx;
    setter(true);
    setError(null);

    try {
      const response = await fetch("/api/campaign/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exportInput, format }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Export failed.";
        setError(msg);
        return;
      }

      const blob = await response.blob();
      const filename =
        format === "markdown"
          ? "campaign-strategy-report.md"
          : format === "html"
            ? "campaign-strategy-report.html"
            : "campaign-route-deck.pptx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setter(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Strategy Report</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-6 text-stone-600">
          Export a client-ready campaign strategy report. The report is generated deterministically
          from the workflow output — no LLM is used in export.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport("markdown")}
            disabled={isExporting}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-500 hover:text-stone-950 disabled:cursor-wait disabled:opacity-60"
          >
            {isExportingMd ? "Exporting…" : "Export Markdown"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("html")}
            disabled={isExporting}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-500 hover:text-stone-950 disabled:cursor-wait disabled:opacity-60"
          >
            {isExportingHtml ? "Exporting…" : "Export HTML"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("pptx")}
            disabled={isExporting}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-500 hover:text-stone-950 disabled:cursor-wait disabled:opacity-60"
          >
            {isExportingPptx ? "Exporting…" : "Export Route Deck (PPTX)"}
          </button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <p className="text-xs leading-5 text-stone-400">
          Exported files include synthetic-research caveats, legal/substantiation checklists, and
          a disclaimer that scores are strategic estimates, not predictions. The PPTX route deck
          repeats the same caveats on every slide for offline circulation. No PDF export in v1.
        </p>
      </CardContent>
    </Card>
  );
}
