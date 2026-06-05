"use client";

interface AppShellProps {
  mode: "intake" | "results";
  onNewRun?: () => void;
  hasExecutionPlan?: boolean;
  onExport?: () => void;
  isRunning?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  mode,
  onNewRun,
  hasExecutionPlan,
  onExport,
  isRunning,
  children,
}: AppShellProps) {
  if (mode === "intake") {
    return (
      <main className="min-h-screen bg-stone-100 text-stone-950">
        {children}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 md:px-8">
          <span className="text-sm font-semibold text-stone-950">Campaign Sandbox</span>
          <span className="text-stone-300">·</span>
          {isRunning ? (
            <span className="text-xs text-stone-400">Running workflow…</span>
          ) : (
            <span className="text-xs text-stone-500">Results workspace</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {hasExecutionPlan && onExport ? (
              <button
                type="button"
                onClick={onExport}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900"
              >
                Export
              </button>
            ) : null}
            {onNewRun ? (
              <button
                type="button"
                onClick={onNewRun}
                className="rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                New run
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
