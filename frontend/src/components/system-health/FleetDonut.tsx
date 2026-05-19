import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { FleetCounts } from "@/lib/system-health/telemetry";

export function FleetDonut({ fleet }: { fleet: FleetCounts }) {
  const data = [
    { name: "Online", value: fleet.online, color: "#3DDC97" },
    { name: "Degraded", value: fleet.degraded, color: "#F5A524" },
    { name: "Offline", value: fleet.offline, color: "#FF5C5C" },
  ];
  const total = fleet.online + fleet.offline + fleet.degraded;
  const onlinePercent = total > 0 ? ((fleet.online / total) * 100).toFixed(1) : "0.0";
  return (
    <Panel title="Printer Fleet" meta={`${total.toLocaleString("en-US")} printers`}>
      <div className="flex items-center gap-5">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={48}
                outerRadius={68}
                stroke="#0A0B0F"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data
                  .filter((d) => d.value > 0)
                  .map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#525a6e]">
              online
            </span>
            <span className="font-mono text-xl tabular-nums text-[#E6E8EE]">{onlinePercent}%</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2">
          {data
            .filter((d) => d.value > 0)
            .map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between border-b border-[#1F2330]/60 pb-1.5"
              >
                <span className="flex items-center gap-2 text-[12px] text-[#7A8194]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-mono text-[14px] tabular-nums text-[#E6E8EE]">
                  {d.value.toLocaleString("en-US")}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">{title}</span>
        {meta && <span className="font-mono text-[11px] tabular-nums text-[#525a6e]">{meta}</span>}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
