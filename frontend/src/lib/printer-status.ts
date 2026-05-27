import type { DetailedPrinterStatus, Printer, PrinterStatus } from "@/lib/api";

export type OperationalPrinterStatus =
  | "online"
  | "offline"
  | "printing"
  | "warning"
  | "degraded"
  | "idle"
  | "warmup"
  | "unknown";

type PrinterTelemetry = {
  status?: PrinterStatus | DetailedPrinterStatus | string | null;
  toner_percent?: number | null;
  image_unit_percent?: number | null;
  interface_status?: string | null;
};

const STATUS_ALIASES: Record<string, OperationalPrinterStatus> = {
  online: "online",
  offline: "offline",
  printing: "printing",
  idle: "idle",
  warmup: "warmup",
  warming: "warmup",
  warning: "warning",
  warn: "warning",
  degraded: "degraded",
  error: "degraded",
  unknown: "unknown",
  other: "unknown",
  no_data: "unknown",
};

export function normalizePrinterStatus(
  status: PrinterStatus | DetailedPrinterStatus | string | null | undefined,
): OperationalPrinterStatus {
  if (!status) return "unknown";
  return STATUS_ALIASES[String(status).trim().toLowerCase()] ?? "unknown";
}

function isLowConsumable(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value < 20;
}

function isDegradedInterface(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "down" || normalized === "degraded";
}

export function deriveOperationalPrinterStatus(
  details: PrinterTelemetry | null | undefined,
  dashboardPrinter?: Printer | null,
): OperationalPrinterStatus {
  const dashboardStatus = normalizePrinterStatus(dashboardPrinter?.status);
  const detailStatus = normalizePrinterStatus(details?.status);

  if (dashboardStatus === "offline" || detailStatus === "offline") return "offline";
  if (detailStatus === "printing" || dashboardStatus === "printing") return "printing";
  if (detailStatus === "warmup") return "warmup";

  const telemetry = details ?? dashboardPrinter;
  if (isDegradedInterface(details?.interface_status)) return "degraded";
  if (isLowConsumable(telemetry?.toner_percent) || isLowConsumable(telemetry?.image_unit_percent)) {
    return "warning";
  }

  if (detailStatus !== "unknown") return detailStatus;
  if (dashboardStatus !== "unknown") return dashboardStatus;
  return "unknown";
}
