import {
  formatTime,
  STATUS_HEX,
  STATUS_LABEL,
  type PollingInfo,
} from "@/lib/system-health/telemetry";

function formatDurationSeconds(totalSeconds: number): string {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const seconds = clampedSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatNextRun(ms: number | null): string {
  if (ms === null) return "pending";
  if (ms <= 0) return "due now";
  return formatDurationSeconds(ms / 1_000);
}

export function PollingMetrics({ polling }: { polling: PollingInfo }) {
  const color = STATUS_HEX[polling.discoveryStatus];
  const rows: Array<[string, React.ReactNode]> = [
    [
      "Discovery Service",
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{STATUS_LABEL[polling.discoveryStatus]}</span>
      </span>,
    ],
    ["last run", formatTime(polling.lastRun)],
    [
      "next run",
      polling.nextRunInMs === null ? (
        formatNextRun(null)
      ) : (
        <span title={polling.nextRunAt ? formatTime(polling.nextRunAt) : undefined}>
          {formatNextRun(polling.nextRunInMs)}
        </span>
      ),
    ],
    ["cycle", formatDurationSeconds(polling.cycleSec)],
    ["targets", polling.targets.toLocaleString("en-US")],
    ["success rate", `${polling.successRate.toFixed(1)}%`],
  ];
  return (
    <section className="flex h-[320px] flex-col overflow-hidden border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
          Polling Metrics
        </span>
        <span className="font-mono text-[11px] tabular-nums text-[#525a6e]">snmp-poller-01</span>
      </header>
      <dl className="grid flex-1 grid-cols-1 gap-y-1.5 overflow-y-auto p-4">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between border-b border-[#1F2330]/60 pb-2 last:border-0 last:pb-0"
          >
            <dt className="font-mono text-[11px] uppercase tracking-wider text-[#525a6e]">{k}</dt>
            <dd className="font-mono text-[12px] tabular-nums text-[#E6E8EE]">{v}</dd>
          </div>
        ))}
        <div className="mt-1 border-t border-[#1F2330] pt-2 font-mono text-[11px] tabular-nums text-[#7A8194]">
          SNMP Discovery · last scan{" "}
          <span className="text-[#E6E8EE]">{formatTime(polling.lastDiscoveryScan)}</span>
        </div>
      </dl>
    </section>
  );
}
