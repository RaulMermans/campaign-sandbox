"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  id?: string;
  title: string;
  preview?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ id, title, preview, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className="rounded-lg border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-stone-950">{title}</span>
        <span className="text-xs text-stone-400">{open ? "Collapse ↑" : "Expand ↓"}</span>
      </button>

      {!open && preview ? (
        <div className="border-t border-stone-100 px-5 pb-4 pt-3 text-xs leading-5 text-stone-500">{preview}</div>
      ) : null}

      {open ? <div className="border-t border-stone-100">{children}</div> : null}
    </div>
  );
}
