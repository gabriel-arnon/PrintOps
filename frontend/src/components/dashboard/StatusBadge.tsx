import { cn } from "@/lib/utils";
import type { DetailedPrinterStatus, PrinterStatus } from "@/lib/api";

export type StatusBadgeSize = "sm" | "md";

type AnyStatus = PrinterStatus | DetailedPrinterStatus;

type StatusStyle = {
  label: string;
  /** Shell: translucent fill + refined border + subtle inner highlight */
  shell: string;
  text: string;
  dot: string;
  /** Extremely subtle pulse on the dot only */
  dotPulse?: boolean;
};

/**
 * Operational status tokens — muted chroma, observability-style (no glow, no neon).
 * idle / online → green · printing → blue · warmup → amber · offline → red · unknown → gray
 */
const STATUS_STYLES: Record<AnyStatus, StatusStyle> = {
  online: {
    label: "Online",
    shell:
      "border-[oklch(0.64_0.09_152/0.38)] bg-[oklch(0.62_0.09_152/0.10)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.05)]",
    text: "text-[oklch(0.78_0.09_152)]",
    dot: "bg-[oklch(0.64_0.11_152)]",
  },
  idle: {
    label: "Ocioso",
    shell:
      "border-[oklch(0.64_0.09_152/0.38)] bg-[oklch(0.62_0.09_152/0.10)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.05)]",
    text: "text-[oklch(0.78_0.09_152)]",
    dot: "bg-[oklch(0.64_0.11_152)]",
  },
  printing: {
    label: "Imprimindo",
    shell:
      "border-[oklch(0.58_0.10_246/0.38)] bg-[oklch(0.52_0.09_246/0.11)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.05)]",
    text: "text-[oklch(0.75_0.09_246)]",
    dot: "bg-[oklch(0.56_0.11_246)]",
    dotPulse: true,
  },
  warmup: {
    label: "Aquecendo",
    shell:
      "border-[oklch(0.70_0.11_75/0.36)] bg-[oklch(0.68_0.10_75/0.09)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04)]",
    text: "text-[oklch(0.80_0.10_75)]",
    dot: "bg-[oklch(0.74_0.12_75)]",
  },
  offline: {
    label: "Offline",
    shell:
      "border-[oklch(0.56_0.13_25/0.40)] bg-[oklch(0.52_0.10_25/0.10)] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04)]",
    text: "text-[oklch(0.74_0.11_25)]",
    dot: "bg-[oklch(0.58_0.14_25)]",
  },
  unknown: {
    label: "Desconhecido",
    shell: "border-border/50 bg-muted/20 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04)]",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/55",
  },
};

const SIZE: Record<StatusBadgeSize, { root: string; dot: string }> = {
  sm: {
    root: "gap-2 px-2.5 py-1 text-xs font-semibold leading-none tracking-tight",
    dot: "h-1.5 w-1.5",
  },
  md: {
    root: "gap-2.5 px-3 py-1.5 text-sm font-semibold leading-none tracking-tight",
    dot: "h-2 w-2",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: AnyStatus;
  size?: StatusBadgeSize;
  className?: string;
}) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  const sz = SIZE[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center rounded-full border transition-[background-color,border-color,filter] duration-200 ease-out",
        "hover:brightness-[1.04]",
        sz.root,
        s.shell,
        s.text,
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full shadow-[0_0_0_1px_oklch(0_0_0/0.08)_inset]",
          sz.dot,
          s.dot,
          s.dotPulse && "animate-status-printing",
        )}
        aria-hidden
      />
      <span className="min-w-0">{s.label}</span>
    </span>
  );
}
