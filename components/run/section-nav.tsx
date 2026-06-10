"use client";

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "brief", label: "Brief" },
  { id: "routes", label: "Routes" },
  { id: "simulations", label: "Simulations" },
  { id: "risks", label: "Risks" },
  { id: "comparison", label: "Comparison" },
  { id: "creative-review", label: "Creative Review" },
  { id: "selection", label: "Selection" },
  { id: "execution-plan", label: "Execution Plan" },
  { id: "export", label: "Export" },
  { id: "trace", label: "Trace" },
];

export function SectionNav() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white px-3 py-2">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollTo(id)}
          className="rounded px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
