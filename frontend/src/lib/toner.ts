export type TonerLevel = "ok" | "warn" | "critical";

export function getTonerLevel(percent: number): TonerLevel {
  if (percent < 20) return "critical";
  if (percent <= 40) return "warn";
  return "ok";
}

export const tonerColorVar: Record<TonerLevel, string> = {
  ok: "var(--success)",
  warn: "var(--warning)",
  critical: "var(--destructive)",
};

export const tonerTextClass: Record<TonerLevel, string> = {
  ok: "text-[oklch(0.72_0.17_152)]",
  warn: "text-[oklch(0.78_0.16_75)]",
  critical: "text-[oklch(0.62_0.22_25)]",
};
