import {
  formatTime,
  formatUptime,
  STATUS_HEX,
  STATUS_LABEL,
  type Status,
} from "@/lib/system-health/telemetry";

interface Props {
  now: Date;
  bootedAt: Date;
  lastSync: Date;
  global: Status;
  realtimeConnections: number;
}

export function TopBar({ now, bootedAt, lastSync, global, realtimeConnections }: Props) {
  const color = STATUS_HEX[global];
  return (
    <header className="flex items-center justify-between border-b border-[#1F2330] bg-[#0A0B0F]/80 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-[#1F2330] bg-[#11131A]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-[#E6E8EE]">PrintOps</span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
            System Health
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5 font-mono text-[11px] tabular-nums text-[#7A8194]">
        <Pill label="ws clients" value={String(realtimeConnections)} />
        <Pill label="last sync" value={formatTime(lastSync)} />
        <Pill label="uptime" value={formatUptime(bootedAt, now)} />
        <div className="flex items-center gap-2 rounded-sm border border-[#1F2330] bg-[#11131A] px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          <span className="text-[#E6E8EE]">{STATUS_LABEL[global]}</span>
        </div>
        <span className="text-[#E6E8EE]">{formatTime(now)}</span>
      </div>
    </header>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[#525a6e]">{label}</span>
      <span className="text-[#E6E8EE]">{value}</span>
    </span>
  );
}
