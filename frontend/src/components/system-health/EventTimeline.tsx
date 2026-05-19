import { SEVERITY_HEX, type OpEvent } from "@/lib/system-health/telemetry";

function formatStamp(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function EventTimeline({ events }: { events: OpEvent[] }) {
  return (
    <section className="flex h-full min-h-0 flex-col border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">Event Timeline</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[#525a6e]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3DDC97]" />
          streaming
        </span>
      </header>
      <ul className="flex-1 divide-y divide-[#1F2330]/60 overflow-y-auto">
        {events.map((ev) => {
          const color = SEVERITY_HEX[ev.severity];
          return (
            <li key={ev.id} className="group relative grid grid-cols-[3px_68px_120px_1fr_56px] items-center gap-3 px-4 py-2 hover:bg-[#0e1017]">
              <span className="h-full" style={{ background: color }} />
              <span className="font-mono text-[11px] tabular-nums text-[#7A8194]">{formatStamp(ev.ts)}</span>
              <span className="font-mono text-[11px] text-[#525a6e]">[{ev.component}]</span>
              <span className="truncate text-[12px] text-[#E6E8EE]">{ev.message}</span>
              <span
                className="justify-self-end rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider"
                style={{ color, borderColor: `${color}33`, background: `${color}11` }}
              >
                {ev.severity}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}