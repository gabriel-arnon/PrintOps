import type { CSSProperties } from "react";

import { getTonerLevel } from "@/lib/toner";

/** Shared observability look — calm grids, muted axes, translucent tooltips */
export const chartMargins = {
  bar: { top: 16, right: 12, left: 4, bottom: 10 },
  barVertical: { top: 8, right: 18, left: 4, bottom: 8 },
  line: { top: 18, right: 14, left: 2, bottom: 10 },
} as const;

export const chartGrid = {
  stroke: "oklch(0.30 0.012 250 / 0.11)",
  strokeDasharray: "3 12",
} as const;

/** Softer fills for health bars — still distinguishable, less saturated */
export function barFillForPercent(percent: number): string {
  const level = getTonerLevel(percent);
  if (level === "ok") return "oklch(0.62 0.09 152)";
  if (level === "warn") return "oklch(0.70 0.09 75)";
  return "oklch(0.54 0.11 25)";
}

export const tooltipContentStyle: CSSProperties = {
  background: "oklch(0.24 0.014 250 / 0.76)",
  border: "1px solid oklch(0.34 0.016 250 / 0.28)",
  borderRadius: "10px",
  boxShadow: "0 10px 36px -12px oklch(0.08 0.02 250 / 0.5), inset 0 1px 0 0 oklch(1 0 0 / 0.05)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  padding: "11px 14px 13px",
  fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "oklch(0.62 0.02 250)",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "8px",
  paddingBottom: "8px",
  borderBottom: "1px solid oklch(1 0 0 / 0.055)",
  lineHeight: 1.3,
};

export const tooltipItemStyle: CSSProperties = {
  color: "oklch(0.88 0.006 250)",
  fontSize: "12px",
  fontWeight: 500,
  paddingTop: "4px",
  lineHeight: 1.45,
};

/** Very light column highlight */
export const barTooltipCursor = {
  fill: "oklch(0.26 0.018 250 / 0.035)",
  radius: 6,
};

export const lineTooltipCursor = {
  stroke: "oklch(0.38 0.02 250 / 0.14)",
  strokeWidth: 1,
  strokeDasharray: "4 6",
};

export const axisTickX = {
  fill: "oklch(0.52 0.02 250)",
  fontSize: 10,
  fontWeight: 500,
};

export const axisTickY = {
  fill: "oklch(0.48 0.018 250)",
  fontSize: 10,
  fontWeight: 500,
};

export const chartAnimation = {
  barDuration: 420,
  lineDuration: 480,
  easing: "ease-out" as const,
};

/** Drawer / sparkline series — muted blue-green tones */
export const historyLineColors = {
  toner: "oklch(0.60 0.09 152)",
  imageUnit: "oklch(0.56 0.09 246)",
} as const;
