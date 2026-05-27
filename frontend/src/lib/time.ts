import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TIME_INVALID_LABEL = "—";
export const RELATIVE_TIME_INVALID = TIME_INVALID_LABEL;

const JUST_NOW_MAX_SECONDS = 5;
const LIVE_INTERVAL_MS = 1_000;
const ISO_WITHOUT_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const ISO_WITH_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

type TimeInput = Date | number | string | null | undefined;

let liveClockTick = 0;
let liveClockInterval: ReturnType<typeof setInterval> | null = null;
const liveClockListeners = new Set<() => void>();

function ensureLiveClock() {
  if (liveClockInterval != null || liveClockListeners.size === 0) return;

  liveClockInterval = setInterval(() => {
    liveClockTick += 1;
    liveClockListeners.forEach((listener) => listener());
  }, LIVE_INTERVAL_MS);
}

function stopLiveClockIfIdle() {
  if (liveClockListeners.size > 0 || liveClockInterval == null) return;
  clearInterval(liveClockInterval);
  liveClockInterval = null;
}

/** Single shared ticker for all temporal labels. */
export function subscribeTemporalClock(onStoreChange: () => void) {
  liveClockListeners.add(onStoreChange);
  ensureLiveClock();

  return () => {
    liveClockListeners.delete(onStoreChange);
    stopLiveClockIfIdle();
  };
}

export function getTemporalClockSnapshot(): number {
  return liveClockTick;
}

export function subscribeRelativeTimeLive(onStoreChange: () => void) {
  return subscribeTemporalClock(onStoreChange);
}

export function getRelativeTimeLiveSnapshot(): number {
  return getTemporalClockSnapshot();
}

/**
 * Parses backend timestamps safely.
 *
 * FastAPI may serialize UTC datetimes without a trailing "Z"; JavaScript would
 * treat those strings as local time. Backend timestamps are UTC, so normalize
 * offset-less ISO datetimes to UTC before constructing the Date.
 */
export function safeDateParse(value: TimeInput): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  const trimmed = value.trim();
  const normalized =
    ISO_WITHOUT_TIMEZONE.test(trimmed) && !ISO_WITH_TIMEZONE.test(trimmed)
      ? `${trimmed}Z`
      : trimmed;

  const date = new Date(normalized);
  return isValid(date) ? date : null;
}

export function parseTimeInput(value: TimeInput): Date | null {
  return safeDateParse(value);
}

export function millisecondsUntilNextRun(
  lastRun: TimeInput,
  cycleSec: number,
  now: TimeInput = Date.now(),
): number | null {
  const lastRunDate = safeDateParse(lastRun);
  const nowDate = safeDateParse(now);
  if (!lastRunDate || !nowDate || cycleSec <= 0) return null;

  const nextRunAt = lastRunDate.getTime() + cycleSec * 1_000;
  return Math.max(0, nextRunAt - nowDate.getTime());
}

export function calculateNextRun(
  lastRun: TimeInput,
  cycleSec: number,
  now: TimeInput = Date.now(),
): Date | null {
  const lastRunDate = safeDateParse(lastRun);
  if (!lastRunDate || cycleSec <= 0) return null;
  return new Date(lastRunDate.getTime() + cycleSec * 1_000);
}

export function formatCountdown(valueMs: number | null | undefined): string {
  if (valueMs == null) return "not scheduled";

  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatRelativeTime(value: TimeInput, options?: { now?: TimeInput }): string {
  const date = safeDateParse(value);
  const now = safeDateParse(options?.now ?? Date.now());
  if (!date || !now) return TIME_INVALID_LABEL;

  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1_000);
  const absSeconds = Math.abs(diffSeconds);
  const suffix = diffSeconds >= 0 ? "há" : "em";

  if (absSeconds < JUST_NOW_MAX_SECONDS) return "agora";
  if (absSeconds < 60) return `${suffix} ${absSeconds} segundos`;

  const minutes = Math.floor(absSeconds / 60);
  if (minutes < 60) return `${suffix} ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${suffix} ${hours} horas`;

  const days = Math.floor(hours / 24);
  return `${suffix} ${days} dias`;
}

export function formatAbsoluteTime(
  value: TimeInput,
  options?: { includeDate?: boolean; seconds?: boolean },
): string {
  const date = safeDateParse(value);
  if (!date) return TIME_INVALID_LABEL;

  const pattern = [
    options?.includeDate ? "dd/MM/yyyy" : null,
    options?.seconds === false ? "HH:mm" : "HH:mm:ss",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    return format(date, pattern, { locale: ptBR });
  } catch {
    return TIME_INVALID_LABEL;
  }
}

export function formatLongAbsoluteTime(value: TimeInput): string | null {
  const date = safeDateParse(value);
  if (!date) return null;

  try {
    return format(date, "PPpp", { locale: ptBR });
  } catch {
    return null;
  }
}

export function formatUptime(from: TimeInput, now: TimeInput = Date.now()): string {
  const fromDate = safeDateParse(from);
  const nowDate = safeDateParse(now);
  if (!fromDate || !nowDate) return TIME_INVALID_LABEL;

  const ms = Math.max(0, nowDate.getTime() - fromDate.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatRelativeOperationalTime(value: TimeInput): string {
  return formatRelativeTime(value);
}

export function formatRelativeToNow(value: TimeInput, options?: { baseDate?: Date }): string {
  return formatRelativeTime(value, { now: options?.baseDate ?? Date.now() });
}

export function formatAbsolutePtBr(value: TimeInput): string | null {
  return formatLongAbsoluteTime(value);
}

export function formatShortClockTime(value: TimeInput): string {
  return formatAbsoluteTime(value, { seconds: false });
}
