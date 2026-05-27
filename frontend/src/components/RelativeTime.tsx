import { useMemo } from "react";

import { useTemporalTick } from "@/hooks/useTemporalTick";
import { cn } from "@/lib/utils";
import { formatAbsoluteTime, formatRelativeTime, parseTimeInput } from "@/lib/time";

export interface RelativeTimeProps {
  /** Instant to display relative to now */
  date: Date | number | string | null | undefined;
  /** Periodically refresh the label (uses one shared 10s interval across the app). */
  live?: boolean;
  className?: string;
}

/**
 * Operational relative timestamp (pt-BR) with optional live updates and absolute time in `title`.
 */
export function RelativeTime({ date, live = false, className }: RelativeTimeProps) {
  const parsedDate = useMemo(() => parseTimeInput(date), [date]);
  const canLive = live && parsedDate != null;

  useTemporalTick(canLive);

  const label = parsedDate ? formatRelativeTime(parsedDate) : "";
  const title = parsedDate ? formatAbsoluteTime(parsedDate, { includeDate: true }) : null;

  return (
    <span className={cn("tabular-nums", className)} title={title ?? undefined}>
      {label}
    </span>
  );
}
