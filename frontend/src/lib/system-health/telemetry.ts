import { useTemporalTick } from "@/hooks/useTemporalTick";
import type { EventCategory, SystemTelemetry } from "@/lib/api";
import {
  calculateNextRun,
  formatAbsoluteTime,
  formatCountdown as formatCountdownMs,
  formatUptime as formatUptimeValue,
  millisecondsUntilNextRun,
  safeDateParse,
} from "@/lib/time";

export type Status = "ok" | "warn" | "error";
export type Severity = "info" | "warn" | "error";
export type TelemetrySource = "real" | "client-generated" | "not-collected";

const GLOBAL_HEALTHY_SCORE = 80;
const GLOBAL_DEGRADED_SCORE = 60;

export interface ServiceHealth {
  id: string;
  name: string;
  status: Status;
  primary: string;
  secondary: string;
  spark: number[];
  source: TelemetrySource;
}

export interface FleetCounts {
  online: number;
  offline: number;
  degraded: number;
}

export interface PollingInfo {
  discoveryStatus: Status;
  lastRun: Date | null;
  nextRunAt: Date | null;
  nextRunInMs: number | null;
  cycleSec: number;
  targets: number;
  successRate: number;
  lastDiscoveryScan: Date | null;
}

export interface LatencyPoint {
  t: number;
  avg: number;
  p95: number;
}

export interface LatencyTelemetry {
  available: boolean;
  points: LatencyPoint[];
  reason: string;
}

export interface OpEvent {
  id: string;
  ts: Date;
  severity: Severity;
  component: string;
  eventType: string;
  category: EventCategory;
  groupCount: number;
  groupLabel: string;
  message: string;
  acknowledged?: boolean;
}

export interface Telemetry {
  now: Date;
  bootedAt: Date;
  lastSync: Date;
  services: ServiceHealth[];
  fleet: FleetCounts;
  polling: PollingInfo;
  latency: LatencyTelemetry;
  events: OpEvent[];
  global: Status;
  realtimeConnections: number;
}

function stableSpark(value: number): number[] {
  return Array.from({ length: 12 }, () => value);
}

function aggregateStatus(services: ServiceHealth[]): Status {
  if (services.some((service) => service.status === "error")) return "error";
  if (services.some((service) => service.status === "warn")) return "warn";
  return "ok";
}

function statusFromFleetHealthScore(score: number | null | undefined): Status | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score >= GLOBAL_HEALTHY_SCORE) return "ok";
  if (score >= GLOBAL_DEGRADED_SCORE) return "warn";
  return "error";
}

function emptyTelemetry(now: Date): Telemetry {
  return {
    now,
    bootedAt: now,
    lastSync: now,
    services: [
      {
        id: "api",
        name: "API",
        status: "warn",
        primary: "loading",
        secondary: "waiting for backend telemetry",
        spark: stableSpark(0),
        source: "client-generated",
      },
    ],
    fleet: { online: 0, offline: 0, degraded: 0 },
    polling: {
      discoveryStatus: "warn",
      lastRun: null,
      nextRunAt: null,
      nextRunInMs: null,
      cycleSec: 0,
      targets: 0,
      successRate: 0,
      lastDiscoveryScan: null,
    },
    latency: {
      available: false,
      points: [],
      reason: "Waiting for backend telemetry.",
    },
    events: [],
    global: "warn",
    realtimeConnections: 0,
  };
}

export function useTelemetry(data?: SystemTelemetry): Telemetry {
  useTemporalTick(true);
  const now = new Date();

  if (!data) return emptyTelemetry(now);

  const bootedAt = safeDateParse(data.booted_at) ?? now;
  const lastSync = safeDateParse(data.server_time) ?? now;
  const lastRun = safeDateParse(data.polling.last_run);
  const nextRunAt = calculateNextRun(lastRun, data.polling.cycle_sec);
  const lastDiscoveryScan = safeDateParse(data.polling.last_discovery_scan);

  const services: ServiceHealth[] = data.services.map((service) => ({
    id: service.id,
    name: service.name,
    status: service.status,
    primary: service.primary,
    secondary: service.secondary,
    spark: stableSpark(service.value),
    source: "real",
  }));
  const scoreStatus = statusFromFleetHealthScore(data.health_score);

  return {
    now,
    bootedAt,
    lastSync,
    services,
    fleet: {
      online: data.fleet.online,
      offline: data.fleet.offline,
      degraded: data.fleet.degraded,
    },
    polling: {
      discoveryStatus: data.polling.discovery_status,
      lastRun,
      nextRunAt,
      nextRunInMs: millisecondsUntilNextRun(lastRun, data.polling.cycle_sec, now),
      cycleSec: data.polling.cycle_sec,
      targets: data.polling.targets,
      successRate: data.polling.success_rate,
      lastDiscoveryScan,
    },
    latency: {
      available: data.snmp_latency.available,
      points: data.snmp_latency.points,
      reason: data.snmp_latency.reason,
    },
    events: [],
    global: data.global_status ?? scoreStatus ?? aggregateStatus(services),
    realtimeConnections: data.realtime_connections,
  };
}

export function formatUptime(from: Date, now: Date): string {
  return formatUptimeValue(from, now);
}

export function formatTime(d: Date | null): string {
  if (!d) return "not recorded";
  return formatAbsoluteTime(d);
}

export function formatCountdown(ms: number | null): string {
  return formatCountdownMs(ms);
}

export const STATUS_LABEL: Record<Status, string> = {
  ok: "Healthy",
  warn: "Degraded",
  error: "Critical",
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
