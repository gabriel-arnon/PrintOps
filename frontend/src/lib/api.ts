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

export type PrinterStatus = "online" | "offline";

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
      // Bypass ngrok's browser warning interstitial
      "ngrok-skip-browser-warning": "true",
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

export async function fetchTimeline() {

  return await request<any[]>(
    "/timeline"
  );

}
 
export async function fetchIncidentSummary() {

  return await request<any>(
    "/incidents/summary"
  );

}

 
export async function acknowledgeEvent(
  eventId: number
) {

  return await request(
    `/events/${eventId}/ack`,
    {
      method: "PATCH",
    }
  );

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

 
 
export async function fetchSystemHealth() {

  return await request<any>(
    "/system/health"
  );

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
