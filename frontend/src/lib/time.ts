import { differenceInSeconds, format, formatDistanceToNow, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RELATIVE_TIME_INVALID = "—";

/** Treat recent past readings as “agora” instead of “há menos de um minuto”. */
const JUST_NOW_MAX_SECONDS = 30;

let liveClockTick = 0;
const liveClockListeners = new Set<() => void>();
let liveClockInterval: ReturnType<typeof setInterval> | null = null;
const LIVE_INTERVAL_MS = 10_000;

function ensureLiveClock() {
  if (liveClockInterval != null) return;
  liveClockInterval = setInterval(() => {
    liveClockTick += 1;
    liveClockListeners.forEach((fn) => fn());
  }, LIVE_INTERVAL_MS);
}

/** Single shared ticker for live relative labels (one timer for all subscribers). */
export function subscribeRelativeTimeLive(onStoreChange: () => void) {
  liveClockListeners.add(onStoreChange);
  ensureLiveClock();
  return () => {
    liveClockListeners.delete(onStoreChange);
    if (liveClockListeners.size === 0 && liveClockInterval != null) {
      clearInterval(liveClockInterval);
      liveClockInterval = null;
    }
  };
}

export function formatRelativeOperationalTime(

  date: string | Date

) {

  const now = new Date();

  const target = new Date(date);

  const diffMs = now.getTime() - target.getTime();

  const diffMinutes = Math.floor(
    diffMs / 1000 / 60
  );

  if (diffMinutes < 1) {

    return "agora";

  }

  if (diffMinutes < 60) {

    return `há ${diffMinutes} min`;

  }

  const diffHours = Math.floor(
    diffMinutes / 60
  );

  if (diffHours < 24) {

    return `há ${diffHours}h`;

  }

  const diffDays = Math.floor(
    diffHours / 24
  );

  return `há ${diffDays}d`;

}



export function getRelativeTimeLiveSnapshot(): number {
  return liveClockTick;
}

export function parseTimeInput(value: Date | number | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  const d = new Date(value);
  return isValid(d) ? d : null;
}

/**
 * Humanized relative time in pt-BR (e.g. “há 2 minutos”, “agora”).
 * Uses {@link formatDistanceToNow} from date-fns with graceful handling for invalid inputs.
 */
export function formatRelativeToNow(
  value: Date | number | string | null | undefined,
  options?: { baseDate?: Date },
): string {
  const date = parseTimeInput(value);
  if (!date) return RELATIVE_TIME_INVALID;

  const base = options?.baseDate ?? new Date();
  const secondsAgo = differenceInSeconds(base, date);
  if (secondsAgo >= 0 && secondsAgo < JUST_NOW_MAX_SECONDS) return "agora";

  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return RELATIVE_TIME_INVALID;
  }
}

/** Full locale date/time for tooltips and accessibility titles. */
export function formatAbsolutePtBr(
  value: Date | number | string | null | undefined,
): string | null {
  const date = parseTimeInput(value);
  if (!date) return null;
  try {
    return format(date, "PPpp", { locale: ptBR });
  } catch {
    return null;
  }
}

/** Short clock label for dense chart axes (unchanged semantics vs instant). */
export function formatShortClockTime(value: Date | number | string | null | undefined): string {
  const date = parseTimeInput(value);
  if (!date) return RELATIVE_TIME_INVALID;
  try {
    return format(date, "HH:mm", { locale: ptBR });
  } catch {
    return RELATIVE_TIME_INVALID;
  }
}
