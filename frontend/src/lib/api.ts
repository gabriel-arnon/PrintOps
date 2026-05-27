/**
 * API client for the FastAPI printer monitoring backend.
 *
 * Configure the base URL via `VITE_API_URL` (e.g. http://localhost:8000).
 *
 * --- Required FastAPI CORS setup ---
 * from fastapi.middleware.cors import CORSMiddleware
 * app.add_middleware(
 *     CORSMiddleware,
 *     allow_origins=["*"],
 *     allow_methods=["*"],
 *     allow_headers=["*"],
 * )
 */

export type PrinterStatus =
  | "online"
  | "offline"
  | "printing"
  | "warning"
  | "degraded"
  | "idle"
  | "unknown"
  | "no_data";

export interface Printer {
  id: number;
  printer: string;
  ip: string;
  model: string;
  serial: string;
  status: PrinterStatus;
  toner_percent: number;
  image_unit_percent: number;
  pages: number;
  last_update: string;
}

export interface HealthStatus {
  ok: boolean;
  latencyMs: number;
}

export type SystemStatus = "ok" | "warn" | "error";
export type EventSeverity = "info" | "warn" | "error";

export interface SystemTelemetryService {
  id: string;
  name: string;
  status: SystemStatus;
  primary: string;
  secondary: string;
  value: number;
}

export interface SystemTelemetryFleet {
  online: number;
  offline: number;
  degraded: number;
  total: number;
}

export interface SystemTelemetryPolling {
  discovery_status: SystemStatus;
  last_run: string | null;
  cycle_sec: number;
  targets: number;
  success_rate: number;
  last_discovery_scan: string | null;
}

export interface SystemTelemetryIncidentCounts {
  active: number;
  unacknowledged: number;
  critical: number;
  recoveries_24h: number;
  events_24h: number;
}

export interface SystemTelemetryLatencyPoint {
  t: number;
  avg: number;
  p95: number;
}

export interface SystemTelemetryLatency {
  available: boolean;
  points: SystemTelemetryLatencyPoint[];
  reason: string;
}

export interface SystemTelemetry {
  server_time: string;
  booted_at: string;
  realtime_connections: number;
  services: SystemTelemetryService[];
  fleet: SystemTelemetryFleet;
  polling: SystemTelemetryPolling;
  incidents: SystemTelemetryIncidentCounts;
  snmp_latency: SystemTelemetryLatency;
}

export interface TimelineEvent {
  id: number;
  printer: string;
  event_type: string;
  severity: EventSeverity;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface PrinterEvent {
  id: number;
  event_type: string;
  severity: EventSeverity;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface ActiveIncident {
  printer_id: number;
  printer: string;
  severity: EventSeverity;
  acknowledged: boolean;
  offline_since: string;
  duration_sec: number;
}

export interface IncidentSummaryData {
  active: number;
  unacknowledged: number;
  critical: number;
  recoveries_24h: number;
}

export interface SystemHealthData {
  discovery_status: SystemStatus;
  targets: number;
  online: number;
  offline: number;
  success_rate: number;
  cycle_sec: number;
  last_run: string | null;
  last_discovery_scan: string | null;
}

import { getToken, redirectToLogin } from "./auth";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error("VITE_API_URL not configured");
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    mode: "cors",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 401) {
    redirectToLogin();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = (body as { detail?: string })?.detail ?? JSON.stringify(body);
    } catch {
      // ignore
    }
    throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchTimeline(): Promise<TimelineEvent[]> {
  return await request<TimelineEvent[]>("/timeline");
}

export async function fetchPrinterEvents(printerId: number): Promise<PrinterEvent[]> {
  return await request<PrinterEvent[]>(`/printers/${printerId}/events`);
}

export async function fetchActiveIncidents(): Promise<ActiveIncident[]> {
  return await request<ActiveIncident[]>("/incidents/active");
}

export async function fetchIncidentSummary(): Promise<IncidentSummaryData> {
  return await request<IncidentSummaryData>("/incidents/summary");
}

export async function acknowledgeEvent(eventId: number) {
  return await request(`/events/${eventId}/ack`, {
    method: "PATCH",
  });
}

export interface CreatePrinterInput {
  name: string;
  ip: string;
}

export async function createPrinter(input: CreatePrinterInput): Promise<Printer> {
  return await request<Printer>("/printers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deletePrinter(id: number): Promise<void> {
  await request<unknown>(`/printers/${id}`, { method: "DELETE" });
}

export async function updatePrinter(id: number, input: { name: string }): Promise<Printer> {
  return await request<Printer>(`/printers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  return await request<SystemHealthData>("/system/health");
}

export async function fetchSystemTelemetry(): Promise<SystemTelemetry> {
  return await request<SystemTelemetry>("/system/telemetry");
}

export interface DiscoveredPrinter {
  ip: string;
  model: string;
  serial: string;
  status: PrinterStatus;
  already_added: boolean;
}

export async function discoverPrinters(): Promise<DiscoveredPrinter[]> {
  return await request<DiscoveredPrinter[]>("/discover");
}

export async function fetchDashboard(): Promise<Printer[]> {
  return await request<Printer[]>("/dashboard");
}

export type DetailedPrinterStatus =
  | "idle"
  | "printing"
  | "warmup"
  | "online"
  | "offline"
  | "warning"
  | "degraded"
  | "unknown";

export interface PrinterDetails {
  id: number;
  name: string;
  model: string;
  ip: string;
  serial: string;
  status: DetailedPrinterStatus;
  uptime: string;
  hostname: string;
  mac: string;
  firmware: string;
  toner_percent: number;
  image_unit_percent: number;
  pages: number;
  last_update: string | null;
  interface_status?: "up" | "down" | "unknown" | string;
}

export interface PrinterHistoryPoint {
  created_at: string;
  toner_percent: number;
  image_unit_percent: number;
  pages: number;
  status: string;
}

export interface PrinterStats {
  pages_today: number;
  pages_week: number;
  daily_average: number;
}

export async function fetchPrinterDetails(id: number): Promise<PrinterDetails> {
  return await request<PrinterDetails>(`/printers/${id}/details`);
}

export async function fetchPrinterHistory(id: number): Promise<PrinterHistoryPoint[]> {
  return await request<PrinterHistoryPoint[]>(`/printers/${id}/history`);
}

export async function fetchPrinterStats(id: number): Promise<PrinterStats> {
  return await request<PrinterStats>(`/printers/${id}/stats`);
}

export async function fetchHealth(): Promise<HealthStatus> {
  const start = performance.now();
  try {
    await request<unknown>("/health");
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}
