import { getTonerLevel, tonerTextClass } from "@/lib/toner";
import { cn } from "@/lib/utils";

interface TonerBarProps {
  percent: number;
  showLabel?: boolean;
  className?: string;
}

export function TonerBar({ percent, showLabel = true, className }: TonerBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const level = getTonerLevel(clamped);

  const fillBg =
    level === "ok"
      ? "bg-[oklch(0.72_0.17_152)]"
      : level === "warn"
        ? "bg-[oklch(0.78_0.16_75)]"
        : "bg-[oklch(0.62_0.22_25)]";

  return (
    <div className={cn("flex items-center gap-2 min-w-[120px]", className)}>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", fillBg)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("w-10 text-right text-xs font-semibold tabular-nums", tonerTextClass[level])}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
