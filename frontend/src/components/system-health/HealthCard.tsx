import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { STATUS_HEX, STATUS_LABEL, type ServiceHealth } from "@/lib/system-health/telemetry";

export function HealthCard({ service }: { service: ServiceHealth }) {
  const color = STATUS_HEX[service.status];
  const data = service.spark.map((v, i) => ({ i, v }));
  return (
    <div className="relative flex flex-col gap-3 border border-[#1F2330] bg-[#11131A] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">{service.name}</span>
        </div>
        <span
          className="rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider"
          style={{ color, borderColor: `${color}33`, background: `${color}11` }}
        >
          {STATUS_LABEL[service.status]}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl tabular-nums text-[#E6E8EE]">{service.primary}</span>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-[#7A8194]">{service.secondary}</span>
      <div className="-mx-1 -mb-1 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.4}
              fill={`url(#spark-${service.id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}