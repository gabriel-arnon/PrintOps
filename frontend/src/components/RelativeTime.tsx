import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  formatAbsolutePtBr,
  formatRelativeToNow,
  getRelativeTimeLiveSnapshot,
  parseTimeInput,
  subscribeRelativeTimeLive,
} from "@/lib/time";

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
  const canLive = live && parseTimeInput(date) != null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => (canLive ? subscribeRelativeTimeLive(onStoreChange) : () => {}),
    [canLive],
  );

  const getSnapshot = useCallback(() => (canLive ? getRelativeTimeLiveSnapshot() : 0), [canLive]);

  const getServerSnapshot = useCallback(() => 0, []);

  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const label = formatRelativeToNow(date);

  const title = formatAbsolutePtBr(date);

  return (
    <span className={cn("tabular-nums", className)} title={title ?? undefined}>
      {label}
    </span>
  );
}
