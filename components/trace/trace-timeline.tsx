import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TraceEvent } from "@/lib/schemas/trace";

export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trace Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3">
          {events.map((event) => (
            <li key={event.id} className="grid grid-cols-[0.75rem_1fr] gap-3">
              <span className="mt-2 h-3 w-3 rounded-full bg-stone-950" />
              <div>
                <p className="text-sm font-medium text-stone-950">{event.stageId}</p>
                <p className="text-sm leading-6 text-stone-700">{event.message}</p>
                <p className="text-xs text-stone-500">
                  {event.type} / {event.status}
                  {event.durationMs ? ` / ${event.durationMs}ms` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
