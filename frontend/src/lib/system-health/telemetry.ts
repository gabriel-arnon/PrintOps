import { useEffect, useState } from "react";

import type { SystemTelemetry } from "@/lib/api";

export type Status = "ok" | "warn" | "error";
export type Severity = "info" | "warn" | "error";
export type TelemetrySource = "real" | "client-generated" | "not-collected";

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
  nextRunInSec: number | null;
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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stableSpark(value: number): number[] {
  return Array.from({ length: 12 }, () => value);
}

function calculateNextRunInSec(lastRun: Date | null, cycleSec: number, now: Date): number | null {
  if (!lastRun || cycleSec <= 0) return null;

  const elapsedSec = Math.floor((now.getTime() - lastRun.getTime()) / 1_000);
  return Math.max(0, cycleSec - elapsedSec);
}

function aggregateStatus(services: ServiceHealth[]): Status {
  if (services.some((service) => service.status === "error")) return "error";
  if (services.some((service) => service.status === "warn")) return "warn";
  return "ok";
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
      nextRunInSec: null,
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) return emptyTelemetry(now);

  const bootedAt = parseDate(data.booted_at) ?? now;
  const lastSync = parseDate(data.server_time) ?? now;
  const lastRun = parseDate(data.polling.last_run);
  const lastDiscoveryScan = parseDate(data.polling.last_discovery_scan);

  const services: ServiceHealth[] = data.services.map((service) => ({
    id: service.id,
    name: service.name,
    status: service.status,
    primary: service.primary,
    secondary: service.secondary,
    spark: stableSpark(service.value),
    source: "real",
  }));

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
      nextRunInSec: calculateNextRunInSec(lastRun, data.polling.cycle_sec, now),
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
    global: aggregateStatus(services),
    realtimeConnections: data.realtime_connections,
  };
}

export function formatUptime(from: Date, now: Date): string {
  const ms = Math.max(0, now.getTime() - from.getTime());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function formatTime(d: Date | null): string {
  if (!d) return "not recorded";
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function formatCountdown(sec: number | null): string {
  if (sec === null) return "not scheduled";

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
