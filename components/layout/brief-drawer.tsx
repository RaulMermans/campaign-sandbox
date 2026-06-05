"use client";

import { useState } from "react";

interface BriefDrawerProps {
  briefText: string;
  onEditBrief: (text: string) => void;
  onRerun: () => void;
  isRunning: boolean;
}

export function BriefDrawer({ briefText, onEditBrief, onRerun, isRunning }: BriefDrawerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(briefText);

  function handleToggle() {
    if (!open) setDraft(briefText);
    setOpen((o) => !o);
  }

  function handleApplyAndRerun() {
    onEditBrief(draft);
    setOpen(false);
    onRerun();
  }

  return (
    <div className="border-b border-stone-200 bg-white">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-xs font-medium text-stone-500 hover:text-stone-700 md:px-8"
      >
        <span
          className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        {open ? "Hide brief" : "Show / edit brief"}
      </button>
      {open ? (
        <div className="border-t border-stone-100 px-5 pb-4 pt-3 md:px-8">
          <p className="mb-2 text-xs text-stone-400">
            Edit the brief and re-run the simulation. All results will be replaced.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded border border-stone-300 bg-stone-50 p-3 text-sm leading-6 text-stone-800 placeholder-stone-400 focus:border-stone-500 focus:outline-none"
            rows={6}
            aria-label="Edit campaign brief"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleApplyAndRerun}
              disabled={isRunning || draft.trim().length < 20}
              className="rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:cursor-wait disabled:opacity-50"
            >
              {isRunning ? "Running…" : "Apply and re-run"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
