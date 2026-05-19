import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LatencyTelemetry } from "@/lib/system-health/telemetry";

export function SnmpLatencyChart({ latency }: { latency: LatencyTelemetry }) {
  const data = latency.points;
  const last = data[data.length - 1];
  const avgNow = last?.avg ?? 0;
  const p95Now = last?.p95 ?? 0;

  return (
    <section className="flex h-full flex-col border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
          SNMP Latency - last 30m
        </span>
        <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
          {latency.available ? (
            <>
              <span className="flex items-center gap-1.5 text-[#7A8194]">
                <span className="h-[2px] w-3" style={{ background: "#5B8CFF" }} />
                avg <span className="text-[#E6E8EE]">{avgNow} ms</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#7A8194]">
                <span className="h-[2px] w-3" style={{ background: "#F5A524" }} />
                p95 <span className="text-[#E6E8EE]">{p95Now} ms</span>
              </span>
            </>
          ) : (
            <span className="rounded-sm border border-[#F5A52433] bg-[#F5A52411] px-1.5 py-[1px] text-[#F5A524]">
              not collected
            </span>
          )}
        </div>
      </header>
      <div className="flex-1 p-2">
        {latency.available && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1F2330" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => {
                  const d = new Date(t);
                  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                }}
                stroke="#525a6e"
                tick={{ fill: "#525a6e", fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#1F2330" }}
                minTickGap={40}
              />
              <YAxis
                stroke="#525a6e"
                tick={{ fill: "#525a6e", fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#1F2330" }}
                width={36}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0A0B0F",
                  border: "1px solid #1F2330",
                  borderRadius: 4,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color: "#E6E8EE",
                }}
                labelFormatter={(t) =>
                  new Date(t as number).toLocaleTimeString("en-GB", { hour12: false })
                }
                formatter={(v: number, n) => [`${v} ms`, n]}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#5B8CFF"
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="#F5A524"
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[11px] leading-5 text-[#7A8194]">
            {latency.reason}
          </div>
        )}
      </div>
    </section>
  );
}
