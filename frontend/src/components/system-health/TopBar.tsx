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

export function OperationalTelemetryStrip({
  now,
  bootedAt,
  lastSync,
  global,
  realtimeConnections,
}: Props) {
  const color = STATUS_HEX[global];

  return (
    <div className="flex min-w-0 items-center gap-4 font-mono text-[11px] tabular-nums text-[#7A8194]">
      <Pill label="ws" value={String(realtimeConnections)} />
      <Pill label="sync" value={formatTime(lastSync)} />
      <Pill label="uptime" value={formatUptime(bootedAt, now)} />
      <div className="flex items-center gap-2 rounded-sm border border-[#1F2330] bg-[#11131A] px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[#E6E8EE]">{STATUS_LABEL[global]}</span>
      </div>
      <span className="hidden text-[#E6E8EE] xl:inline">{formatTime(now)}</span>
    </div>
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
