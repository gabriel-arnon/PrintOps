import { useEffect, useRef, useState } from "react";

export type Status = "ok" | "warn" | "error";
export type Severity = "info" | "warn" | "error";

export interface ServiceHealth {
  id: string;
  name: string;
  status: Status;
  primary: string;
  secondary: string;
  spark: number[];
}

export interface FleetCounts {
  online: number;
  offline: number;
  degraded: number;
}

export interface PollingInfo {
  discoveryStatus: Status;
  lastRun: Date;
  nextRunInSec: number;
  cycleSec: number;
  targets: number;
  successRate: number;
  lastDiscoveryScan: Date;
}

export interface LatencyPoint {
  t: number;
  avg: number;
  p95: number;
}

export interface OpEvent {
  id: string;
  ts: Date;
  severity: Severity;
  component: string;
  message: string;
}

export interface Telemetry {
  now: Date;
  bootedAt: Date;
  lastSync: Date;
  services: ServiceHealth[];
  fleet: FleetCounts;
  polling: PollingInfo;
  latency: LatencyPoint[];
  events: OpEvent[];
  global: Status;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function buildSpark(base: number, jitter: number, n = 30): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(0, v + rand(-jitter, jitter));
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

function buildLatencySeries(n = 30): LatencyPoint[] {
  const out: LatencyPoint[] = [];
  const now = Date.now();
  let avg = 850;
  for (let i = n - 1; i >= 0; i--) {
    avg = Math.max(420, Math.min(1800, avg + rand(-90, 90)));
    const p95 = avg + rand(180, 520);
    out.push({
      t: now - i * 60_000,
      avg: Math.round(avg),
      p95: Math.round(p95),
    });
  }
  return out;
}

const INITIAL_EVENTS: Omit<OpEvent, "id" | "ts">[] = [
  { severity: "warn", component: "snmp.poller", message: "SNMP timeout printer HP-4521 vlan 24" },
  { severity: "info", component: "discovery", message: "Discovery cycle completed in 4.2s" },
  { severity: "warn", component: "polling", message: "Polling cycle delayed 1.4s above target" },
  { severity: "info", component: "postgres", message: "Autovacuum completed on table printer_events" },
  { severity: "info", component: "discovery", message: "SNMP Discovery rescanned vlan 12 (412 hosts)" },
  { severity: "info", component: "api", message: "Health probe ok across 3 replicas" },
  { severity: "warn", component: "snmp.poller", message: "Retrying OID 1.3.6.1.2.1.43.10.2.1.4 on KX-MB2010" },
  { severity: "info", component: "api", message: "Rate limiter reset window" },
];

const STREAM_TEMPLATES: Omit<OpEvent, "id" | "ts">[] = [
  { severity: "info", component: "polling", message: "Polling cycle completed (1.333 targets)" },
  { severity: "info", component: "discovery", message: "SNMP Discovery scan completed" },
  { severity: "warn", component: "snmp.poller", message: "SNMP timeout printer XR-9870" },
  { severity: "info", component: "api", message: "Health probe ok across replicas" },
  { severity: "warn", component: "polling", message: "Polling lag above target threshold" },
  { severity: "info", component: "postgres", message: "Connection pool stable 8/100" },
  { severity: "error", component: "snmp.poller", message: "OID timeout exceeded retry budget on HP-LJ-9050" },
];

let evCounter = 0;
function makeEvent(template: Omit<OpEvent, "id" | "ts">, ts = new Date()): OpEvent {
  evCounter += 1;
  return { ...template, id: `ev-${ts.getTime()}-${evCounter}`, ts };
}

function buildInitialEvents(now: Date): OpEvent[] {
  return INITIAL_EVENTS.map((t, i) =>
    makeEvent(t, new Date(now.getTime() - (i + 1) * 1000 * 60 * (1 + Math.floor(i / 2))))
  );
}

function aggregateStatus(services: ServiceHealth[]): Status {
  if (services.some((s) => s.status === "error")) return "error";
  if (services.some((s) => s.status === "warn")) return "warn";
  return "ok";
}

const BOOT_KEY = "printops:bootedAt";
function readBootedAt(): Date {
  if (typeof window === "undefined") return new Date();
  const stored = window.localStorage.getItem(BOOT_KEY);
  if (stored) {
    const d = new Date(stored);
    if (!isNaN(d.getTime())) return d;
  }
  // Simulate a long-running backend: anchor uptime to ~27 days ago, persisted.
  const anchor = new Date(Date.now() - (27 * 24 + 14) * 60 * 60 * 1000);
  window.localStorage.setItem(BOOT_KEY, anchor.toISOString());
  return anchor;
}

export function useTelemetry(): Telemetry {
  const bootedRef = useRef<Date | null>(null);
  if (!bootedRef.current) bootedRef.current = readBootedAt();

  const [now, setNow] = useState(() => new Date());
  const [latency, setLatency] = useState<LatencyPoint[]>(() => buildLatencySeries());
  const [events, setEvents] = useState<OpEvent[]>(() => buildInitialEvents(new Date()));
  const [services, setServices] = useState<ServiceHealth[]>(() => [
    {
      id: "api",
      name: "API",
      status: "ok",
      primary: "p95 42 ms",
      secondary: "err 0.02% · 3 replicas",
      spark: buildSpark(42, 6),
    },
    {
      id: "postgres",
      name: "PostgreSQL",
      status: "ok",
      primary: "8 / 100 conn",
      secondary: "query 2.1 ms · repl lag 14 ms",
      spark: buildSpark(8, 1.2),
    },
    {
      id: "snmp",
      name: "SNMP Polling Engine",
      status: "warn",
      primary: "avg 1.2 s",
      secondary: "last cycle 14:21 · 37 timeouts",
      spark: buildSpark(1.2, 0.18),
    },
  ]);
  const [fleet, setFleet] = useState<FleetCounts>({ online: 1284, offline: 37, degraded: 12 });
  const [polling, setPolling] = useState<PollingInfo>(() => ({
    discoveryStatus: "ok",
    lastRun: new Date(Date.now() - 22_000),
    nextRunInSec: 38,
    cycleSec: 60,
    targets: 1333,
    successRate: 97.4,
    lastDiscoveryScan: new Date(Date.now() - 4 * 60_000),
  }));

  // Tick clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Polling countdown
  useEffect(() => {
    const id = setInterval(() => {
      setPolling((p) => {
        const next = p.nextRunInSec - 1;
        if (next <= 0) {
          const ran = new Date();
          setEvents((evs) =>
            [
              makeEvent(
                {
                  severity: "info",
                  component: "polling",
                  message: `Polling cycle completed (${p.targets.toLocaleString("en-US")} targets)`,
                },
                ran
              ),
              ...evs,
            ].slice(0, 80)
          );
          return { ...p, lastRun: ran, nextRunInSec: p.cycleSec };
        }
        return { ...p, nextRunInSec: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Telemetry refresh every ~5s: sparklines, latency tail, fleet drift, service status
  useEffect(() => {
    const id = setInterval(() => {
      setLatency((s) => {
        const last = s[s.length - 1];
        const avg = Math.max(420, Math.min(1800, last.avg + rand(-90, 90)));
        const p95 = Math.round(avg + rand(180, 520));
        return [...s.slice(1), { t: Date.now(), avg: Math.round(avg), p95 }];
      });
      setServices((all) =>
        all.map((svc) => {
          const nextVal = Math.max(0, svc.spark[svc.spark.length - 1] + rand(-svc.spark[0] * 0.08, svc.spark[0] * 0.08));
          return { ...svc, spark: [...svc.spark.slice(1), Number(nextVal.toFixed(2))] };
        })
      );
      setFleet((f) => {
        const drift = Math.round(rand(-2, 2));
        const offlineDrift = Math.round(rand(-1, 1));
        return {
          online: Math.max(1100, f.online + drift),
          offline: Math.max(0, f.offline + offlineDrift),
          degraded: f.degraded,
        };
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Streaming events every ~7s
  useEffect(() => {
    const id = setInterval(() => {
      const tpl = STREAM_TEMPLATES[Math.floor(Math.random() * STREAM_TEMPLATES.length)];
      setEvents((evs) => [makeEvent(tpl), ...evs].slice(0, 80));
    }, 7000);
    return () => clearInterval(id);
  }, []);

  return {
    now,
    bootedAt: bootedRef.current!,
    lastSync: latency[latency.length - 1] ? new Date(latency[latency.length - 1].t) : now,
    services,
    fleet,
    polling,
    latency,
    events,
    global: aggregateStatus(services),
  };
}

export function formatUptime(from: Date, now: Date): string {
  const ms = Math.max(0, now.getTime() - from.getTime());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<Status, string> = {
  ok: "Healthy",
  warn: "Degraded",
  error: "Down",
};

export const STATUS_HEX: Record<Status, string> = {
  ok: "#3DDC97",
  warn: "#F5A524",
  error: "#FF5C5C",
};

export const SEVERITY_HEX: Record<Severity, string> = {
  info: "#5B8CFF",
  warn: "#F5A524",
  error: "#FF5C5C",
};