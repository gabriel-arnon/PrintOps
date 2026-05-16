import { Wifi, WifiOff, Printer as PrintingIcon, Pause, Loader2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrinterStatus, DetailedPrinterStatus } from "@/lib/api";

type AnyStatus = PrinterStatus | DetailedPrinterStatus;

const map: Record<
  AnyStatus,
  { label: string; ring: string; color: string; dot: string; Icon: typeof Wifi }
> = {
  online: {
    label: "Online",
    ring: "border-[oklch(0.72_0.17_152/0.35)] bg-[oklch(0.72_0.17_152/0.10)] shadow-[0_0_0_1px_oklch(0.72_0.17_152/0.05),0_0_12px_-4px_oklch(0.72_0.17_152/0.4)]",
    color: "text-[oklch(0.82_0.17_152)]",
    dot: "bg-[oklch(0.72_0.17_152)]",
    Icon: Wifi,
  },
  idle: {
    label: "Ocioso",
    ring: "border-[oklch(0.72_0.17_152/0.35)] bg-[oklch(0.72_0.17_152/0.10)] shadow-[0_0_0_1px_oklch(0.72_0.17_152/0.05),0_0_12px_-4px_oklch(0.72_0.17_152/0.4)]",
    color: "text-[oklch(0.82_0.17_152)]",
    dot: "bg-[oklch(0.72_0.17_152)]",
    Icon: Pause,
  },
  printing: {
    label: "Imprimindo",
    ring: "border-[oklch(0.68_0.18_240/0.35)] bg-[oklch(0.68_0.18_240/0.10)] shadow-[0_0_12px_-4px_oklch(0.68_0.18_240/0.4)]",
    color: "text-[oklch(0.78_0.16_240)]",
    dot: "bg-[oklch(0.68_0.18_240)]",
    Icon: PrintingIcon,
  },
  warmup: {
    label: "Aquecendo",
    ring: "border-[oklch(0.78_0.16_75/0.35)] bg-[oklch(0.78_0.16_75/0.10)] shadow-[0_0_12px_-4px_oklch(0.78_0.16_75/0.4)]",
    color: "text-[oklch(0.86_0.16_75)]",
    dot: "bg-[oklch(0.78_0.16_75)]",
    Icon: Loader2,
  },
  offline: {
    label: "Offline",
    ring: "border-[oklch(0.62_0.22_25/0.35)] bg-[oklch(0.62_0.22_25/0.10)] shadow-[0_0_12px_-4px_oklch(0.62_0.22_25/0.4)]",
    color: "text-[oklch(0.78_0.20_25)]",
    dot: "bg-[oklch(0.62_0.22_25)]",
    Icon: WifiOff,
  },
  unknown: {
    label: "Desconhecido",
    ring: "border-border bg-muted/30",
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
    Icon: HelpCircle,
  },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const s = map[status] ?? map.unknown;
  const spin = status === "warmup";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
        s.ring,
        s.color,
      )}
    >
      <s.Icon className={cn("h-3 w-3", spin && "animate-spin")} strokeWidth={2} />
      {s.label}
    </span>
  );
}
