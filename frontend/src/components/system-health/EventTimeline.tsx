import { SEVERITY_HEX, type OpEvent } from "@/lib/system-health/telemetry";
import { formatAbsoluteTime } from "@/lib/time";
import type { EventCategory } from "@/lib/api";

function formatStamp(d: Date) {
  return formatAbsoluteTime(d);
}

interface AcknowledgeMutation {
  mutate: (eventId: number) => void;
}

const CATEGORY_STYLES: Record<EventCategory, { label: string; className: string }> = {
  INCIDENT: {
    label: "Incident",
    className: "border-[#FF5C5C33] bg-[#FF5C5C11] text-[#FF8A8A]",
  },
  OPERATIONAL: {
    label: "Ops",
    className: "border-[#5B8CFF33] bg-[#5B8CFF11] text-[#8EAFFF]",
  },
  USER: {
    label: "User",
    className: "border-[#3DDC9733] bg-[#3DDC9711] text-[#3DDC97]",
  },
};

export function EventTimeline({
  events,
  acknowledgeMutation,
}: {
  events: OpEvent[];
  acknowledgeMutation: AcknowledgeMutation;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
          Event Timeline
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[#525a6e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" />
          backend events
        </span>
      </header>
      <ul className="flex-1 divide-y divide-[#1F2330]/60 overflow-y-auto">
        {events.map((ev) => {
          const color = SEVERITY_HEX[ev.severity];
          const categoryStyle = CATEGORY_STYLES[ev.category];
          const canAcknowledge = Number(ev.id) > 0;
          return (
            <li
              key={ev.id}
              className={` group relative grid grid-cols-[3px_68px_88px_120px_112px_1fr_56px_72px] items-center gap-3 px-4 py-2 transition-opacity hover:bg-[#0e1017] ${ev.acknowledged ? "opacity-45" : ""} `}
            >
              <span className="h-full" style={{ background: color }} />
              <span className="font-mono text-[11px] tabular-nums text-[#7A8194]">
                {formatStamp(ev.ts)}
              </span>
              <span
                className={`justify-self-start rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider ${categoryStyle.className}`}
              >
                {categoryStyle.label}
              </span>
              <span className="font-mono text-[11px] text-[#525a6e]">[{ev.component}]</span>
              <span className="truncate rounded-sm border border-[#2A3142] bg-[#151922] px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider text-[#7A8194]">
                {ev.groupLabel}
              </span>
              <span className="truncate text-[12px] text-[#E6E8EE]">{ev.message}</span>
              <span
                className="justify-self-end rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider"
                style={{
                  color,
                  borderColor: `${color}33`,
                  background: `${color}11`,
                }}
              >
                {ev.severity}
              </span>
              {ev.acknowledged ? (
                <span
                  className="
                    justify-self-end
                    rounded-sm
                    border
                    border-[#3DDC9733]
                    bg-[#3DDC9711]
                    px-2
                    py-[2px]
                    font-mono
                    text-[10px]
                    uppercase
                    tracking-wider
                    text-[#3DDC97]
                  "
                >
                  ACKED
                </span>
              ) : canAcknowledge ? (
                <button
                  onClick={() => {
                    console.log("ACK CLICK", ev.id);

                    acknowledgeMutation.mutate(Number(ev.id));
                  }}
                  className="
                    justify-self-end
                    rounded-sm
                    border
                    border-[#2A3142]
                    bg-[#151922]
                    px-2
                    py-[2px]
                    font-mono
                    text-[10px]
                    uppercase
                    tracking-wider
                    text-[#7A8194]
                    transition-colors
                    hover:border-[#3DDC97]
                    hover:text-[#3DDC97]
                  "
                >
                  Ack
                </button>
              ) : (
                <span className="justify-self-end rounded-sm border border-[#5B8CFF33] bg-[#5B8CFF11] px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider text-[#8EAFFF]">
                  Live
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
