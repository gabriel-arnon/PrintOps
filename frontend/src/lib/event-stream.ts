import type { EventCategory, EventSeverity, PrinterEvent, TimelineEvent } from "@/lib/api";
import { safeDateParse } from "@/lib/time";

export const TIMELINE_EVENT_LIMIT = 100;
export const PRINTER_EVENT_LIMIT = 20;
export const EVENT_GROUP_WINDOW_MS = 5 * 60 * 1000;

type EventLike = {
  id: number | string;
  event_type?: string | null;
  message?: string | null;
  printer?: string | null;
  created_at: string;
};

export type GroupedEvent<T> = T & {
  category: EventCategory;
  groupCount: number;
  groupLabel: string;
  groupKey: string;
};

const INCIDENT_TYPES = ["offline", "recovered", "recovery", "warning", "degraded"];
const OPERATIONAL_TYPES = ["polling", "discovery", "synchronization", "sync"];
const USER_TYPES = ["ack", "acknowledge", "acknowledgement", "operator", "user"];

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function classifyEventCategory(eventType?: string | null): EventCategory {
  const normalized = (eventType ?? "").trim().toLowerCase();

  if (includesAny(normalized, USER_TYPES)) return "USER";
  if (includesAny(normalized, OPERATIONAL_TYPES)) return "OPERATIONAL";
  if (includesAny(normalized, INCIDENT_TYPES)) return "INCIDENT";
  return "OPERATIONAL";
}

export function formatEventTypeLabel(eventType?: string | null): string {
  const normalized = (eventType ?? "").trim().toLowerCase();

  if (normalized.includes("offline")) return "Offline";
  if (normalized.includes("recovered") || normalized.includes("recovery")) return "Recovery";
  if (normalized.includes("toner")) return "Toner Low";
  if (normalized.includes("warning")) return "Warning";
  if (normalized.includes("degraded")) return "Degraded";
  if (normalized.includes("polling")) return "Polling";
  if (normalized.includes("discovery")) return "Discovery";
  if (normalized.includes("sync")) return "Synchronization";
  if (normalized.includes("ack")) return "Acknowledgement";

  return normalized
    ? normalized
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ")
    : "Event";
}

function eventTime(event: EventLike): number {
  return safeDateParse(event.created_at)?.getTime() ?? 0;
}

function eventId(event: EventLike): string {
  return String(event.id);
}

export function capEventCollection<T extends EventLike>(events: T[], limit: number): T[] {
  return [...events].sort((a, b) => eventTime(b) - eventTime(a)).slice(0, limit);
}

export function mergeEventCollections<T extends EventLike>(
  current: T[] | undefined,
  incoming: T[],
  limit: number,
): T[] {
  const byId = new Map<string, T>();

  for (const event of [...incoming, ...(current ?? [])]) {
    byId.set(eventId(event), event);
  }

  return capEventCollection([...byId.values()], limit);
}

export function groupEvents<T extends EventLike>(events: T[]): Array<GroupedEvent<T>> {
  const sorted = capEventCollection(events, events.length);
  const groupCounts = new Map<string, number>();
  const groupKeys = new Map<string, string>();

  for (const event of sorted) {
    const printer = (event.printer ?? "").trim().toLowerCase();
    const eventType = (event.event_type ?? "").trim().toLowerCase();
    const bucket = Math.floor(eventTime(event) / EVENT_GROUP_WINDOW_MS);
    const key = `${printer}|${eventType}|${bucket}`;

    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
    groupKeys.set(eventId(event), key);
  }

  return sorted.map((event) => {
    const key = groupKeys.get(eventId(event)) ?? eventId(event);
    const count = groupCounts.get(key) ?? 1;
    const label = formatEventTypeLabel(event.event_type);

    return {
      ...event,
      category: classifyEventCategory(event.event_type),
      groupCount: count,
      groupLabel: count > 1 ? `${label} (${count})` : label,
      groupKey: key,
    };
  });
}

export function makeRealtimeTimelineEvent(event: {
  type?: string;
  message?: string;
  printer?: string;
  severity?: EventSeverity;
}): TimelineEvent {
  const createdAt = new Date().toISOString();
  const eventType = event.type ?? "realtime_event";

  return {
    id: -Date.now(),
    printer: event.printer ?? "Realtime",
    event_type: eventType,
    category: classifyEventCategory(eventType),
    severity: event.severity ?? "info",
    message: event.message ?? "Realtime event received",
    acknowledged: false,
    created_at: createdAt,
  };
}

export function capTimelineEvents(events: TimelineEvent[] | undefined): TimelineEvent[] {
  return capEventCollection(events ?? [], TIMELINE_EVENT_LIMIT);
}

export function capPrinterEvents(events: PrinterEvent[] | undefined): PrinterEvent[] {
  return capEventCollection(events ?? [], PRINTER_EVENT_LIMIT);
}
