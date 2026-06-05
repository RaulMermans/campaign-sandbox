"use client";

interface ExtractedBriefPreviewProps {
  fileName: string;
  fileType: string;
  extractedText: string;
  warnings: string[];
  stats: { characters: number; pages?: number; slides?: number };
  onChange: (text: string) => void;
}

export function ExtractedBriefPreview({
  fileName,
  fileType,
  extractedText,
  warnings,
  stats,
  onChange,
}: ExtractedBriefPreviewProps) {
  const statParts: string[] = [`${stats.characters.toLocaleString()} characters`];
  if (stats.pages != null) statParts.push(`${stats.pages} pages`);
  if (stats.slides != null) statParts.push(`${stats.slides} slides`);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-stone-700">{fileName}</p>
          <p className="text-xs text-stone-400">
            {fileType.toUpperCase()} · {statParts.join(" · ")}
          </p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Extraction notes
          </p>
          <ul className="grid gap-1">
            {warnings.map((w) => (
              <li key={w} className="flex gap-2 text-xs text-amber-800">
                <span className="mt-0.5 shrink-0">·</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500">
          Extracted text — review and edit before running
        </label>
        <textarea
          value={extractedText}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-stone-300 bg-stone-50 p-3 text-sm leading-6 text-stone-800 placeholder-stone-400 focus:border-stone-500 focus:outline-none"
          rows={10}
          aria-label="Extracted brief text"
          spellCheck
        />
      </div>
    </div>
  );
}
