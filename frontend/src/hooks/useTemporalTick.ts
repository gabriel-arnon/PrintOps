import { useSyncExternalStore } from "react";

import { getTemporalClockSnapshot, subscribeTemporalClock } from "@/lib/time";

export function useTemporalTick(enabled = true): number {
  return useSyncExternalStore(
    enabled ? subscribeTemporalClock : () => () => {},
    enabled ? getTemporalClockSnapshot : () => 0,
    () => 0,
  );
}
