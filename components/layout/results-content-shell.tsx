"use client";

interface ResultsContentShellProps {
  children: React.ReactNode;
}

/**
 * Wraps a section of results content with appropriate width constraints.
 * - workspace-readable: max 960px, centered — for long prose
 * - workspace-wide: full available width — for tables and card grids
 * - workspace-compact: tight container for metadata/callouts
 */
export function ResultsContentShell({ children }: ResultsContentShellProps) {
  return <div className="results-content-shell">{children}</div>;
}

/**
 * Constrains content to max-w-[960px] for long prose sections.
 * Keeps text readable without full-bleed stretching.
 */
export function ReadableSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`workspace-readable mx-auto max-w-[960px] ${className}`.trim()}>
      {children}
    </div>
  );
}
