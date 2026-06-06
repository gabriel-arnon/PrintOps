import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Search } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  acknowledgeEvent,
  fetchActiveIncidents,
  fetchHealth,
  fetchIncidentSummary,
  fetchTimeline,
  type ActiveIncident,
  type EventSeverity,
  type TimelineEvent,
} from "@/lib/api";
import { formatEventTypeLabel } from "@/lib/event-stream";
import { formatAbsoluteTime, safeDateParse } from "@/lib/time";

export const Route = createFileRoute("/alert-center")({
  component: AlertCenterPage,
});

type AlertFilter = "all" | "critical" | "warning" | "acknowledged" | "unacknowledged";

type AlertRow = {
  acknowledged: boolean;
  createdAt: string | null;
  eventId: number | null;
  eventType: string;
  matchState: "safe" | "missing" | "ambiguous";
  message: string;
  printer: string;
  severity: EventSeverity;
  status: string;
};

const FILTERS: Array<{ label: string; value: AlertFilter }> = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Acknowledged", value: "acknowledged" },
  { label: "Unacknowledged", value: "unacknowledged" },
];

const SEVERITY_STYLES: Record<EventSeverity, { label: string; className: string }> = {
  error: {
    label: "Critical",
    className: "border-[#FF5C5C33] bg-[#FF5C5C11] text-[#FF8A8A]",
  },
  warn: {
    label: "Warning",
    className: "border-[#F5A52433] bg-[#F5A52411] text-[#F5A524]",
  },
  info: {
    label: "Info",
    className: "border-[#5B8CFF33] bg-[#5B8CFF11] text-[#8EAFFF]",
  },
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function countByPrinter(incidents: ActiveIncident[]) {
  const counts = new Map<string, number>();

  for (const incident of incidents) {
    const printer = normalize(incident.printer);
    counts.set(printer, (counts.get(printer) ?? 0) + 1);
  }

  return counts;
}

function latestOfflineEventsByPrinter(events: TimelineEvent[]) {
  const latestEvents = new Map<string, TimelineEvent>();

  for (const event of events) {
    const printer = normalize(event.printer);

    if (!printer || latestEvents.has(printer)) continue;

    if (event.event_type === "printer_offline") {
      latestEvents.set(printer, event);
    }
  }

  return latestEvents;
}

function buildAlertRows(incidents: ActiveIncident[], events: TimelineEvent[]): AlertRow[] {
  const incidentCounts = countByPrinter(incidents);
  const offlineEvents = latestOfflineEventsByPrinter(events);

  return incidents.map((incident) => {
    const printerKey = normalize(incident.printer);
    const matchedEvent = offlineEvents.get(printerKey);
    const uniqueIncident = incidentCounts.get(printerKey) === 1;
    const safeMatch = uniqueIncident && matchedEvent != null && matchedEvent.id > 0;
    const matchState = safeMatch ? "safe" : matchedEvent ? "ambiguous" : "missing";
    const acknowledged = matchedEvent?.acknowledged ?? incident.acknowledged;
    const eventType = matchedEvent?.event_type ?? "printer_offline";

    return {
      acknowledged,
      createdAt: matchedEvent?.created_at ?? incident.offline_since,
      eventId: safeMatch ? matchedEvent.id : null,
      eventType,
      matchState,
      message: matchedEvent?.message ?? `${incident.printer} is offline`,
      printer: incident.printer,
      severity: matchedEvent?.severity ?? incident.severity,
      status: acknowledged ? "Acknowledged" : "Active",
    };
  });
}

function matchesFilter(row: AlertRow, filter: AlertFilter): boolean {
  if (filter === "critical") return row.severity === "error";
  if (filter === "warning") return row.severity === "warn";
  if (filter === "acknowledged") return row.acknowledged;
  if (filter === "unacknowledged") return !row.acknowledged;
  return true;
}

function matchesSearch(row: AlertRow, search: string): boolean {
  const query = normalize(search);

  if (!query) return true;

  return [row.printer, row.message, row.eventType].some((value) =>
    normalize(value).includes(query),
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="border border-[#1F2330] bg-[#11131A] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function AlertCenterPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
  });

  const activeIncidentsQuery = useQuery({
    queryKey: ["active-incidents"],
    queryFn: fetchActiveIncidents,
    refetchInterval: 5_000,
  });

  const incidentSummaryQuery = useQuery({
    queryKey: ["incident-summary"],
    queryFn: fetchIncidentSummary,
    refetchInterval: 30_000,
  });

  const timelineQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimeline,
    refetchInterval: 30_000,
  });

  const alertRows = useMemo(
    () => buildAlertRows(activeIncidentsQuery.data ?? [], timelineQuery.data ?? []),
    [activeIncidentsQuery.data, timelineQuery.data],
  );

  const filteredRows = useMemo(
    () => alertRows.filter((row) => matchesFilter(row, filter) && matchesSearch(row, search)),
    [alertRows, filter, search],
  );

  const ackableRows = filteredRows.filter((row) => !row.acknowledged && row.eventId != null);

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident-summary"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  const acknowledgeAllMutation = useMutation({
    mutationFn: async (eventIds: number[]) => {
      await Promise.all(eventIds.map((eventId) => acknowledgeEvent(eventId)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident-summary"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  const summary = incidentSummaryQuery.data ?? {
    active: 0,
    critical: 0,
    recoveries_24h: 0,
    unacknowledged: 0,
  };

  const refreshAlerts = () => {
    activeIncidentsQuery.refetch();
    incidentSummaryQuery.refetch();
    timelineQuery.refetch();
    healthQuery.refetch();
  };

  const refreshing =
    activeIncidentsQuery.isFetching ||
    incidentSummaryQuery.isFetching ||
    timelineQuery.isFetching ||
    healthQuery.isFetching ||
    acknowledgeMutation.isPending ||
    acknowledgeAllMutation.isPending;

  return (
    <SidebarProvider>
      <AppSidebar alertCount={summary.active} />

      <SidebarInset>
        <Topbar
          title="Alert Center"
          subtitle="Centralized incidents and operational alerts"
          health={healthQuery.data}
          healthLoading={healthQuery.isLoading}
          lastUpdated={Math.max(
            activeIncidentsQuery.dataUpdatedAt,
            incidentSummaryQuery.dataUpdatedAt,
            timelineQuery.dataUpdatedAt,
          )}
          onRefresh={refreshAlerts}
          refreshing={refreshing}
        />

        <div className="min-h-screen bg-[#0A0B0F] text-[#E6E8EE]">
          <main className="grid gap-4 p-4">
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <SummaryCard label="Active Alerts" value={summary.active} tone="#FF5D73" />
              <SummaryCard label="Critical Alerts" value={summary.critical} tone="#FF3B3B" />
              <SummaryCard
                label="Unacknowledged Alerts"
                value={summary.unacknowledged}
                tone="#FFB84D"
              />
              <SummaryCard label="Recoveries 24h" value={summary.recoveries_24h} tone="#3DDC97" />
            </section>

            <section className="border border-[#1F2330] bg-[#11131A]">
              <header className="flex flex-col gap-3 border-b border-[#1F2330] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#5B8CFF]" />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
                    Alert Center
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-[#525a6e]">
                    {filteredRows.length} visible
                  </span>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <label className="flex h-9 min-w-0 items-center gap-2 border border-[#2A3142] bg-[#0A0B0F] px-3 md:w-72">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#525a6e]" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search alerts"
                      className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[#E6E8EE] outline-none placeholder:text-[#525a6e]"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={ackableRows.length === 0 || acknowledgeAllMutation.isPending}
                    onClick={() => {
                      acknowledgeAllMutation.mutate(
                        ackableRows.map((row) => row.eventId as number),
                      );
                    }}
                    className="h-9 border border-[#2A3142] bg-[#151922] px-3 font-mono text-[11px] uppercase tracking-wider text-[#7A8194] transition-colors hover:border-[#3DDC97] hover:text-[#3DDC97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#2A3142] disabled:hover:text-[#7A8194]"
                  >
                    ACK ALL
                  </button>
                </div>
              </header>

              <div className="flex gap-1 overflow-x-auto border-b border-[#1F2330] px-4 py-2">
                {FILTERS.map((item) => {
                  const active = item.value === filter;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={
                        active
                          ? "h-8 whitespace-nowrap border border-[#5B8CFF] bg-[#5B8CFF22] px-3 font-mono text-[11px] uppercase tracking-wider text-[#E6E8EE]"
                          : "h-8 whitespace-nowrap border border-[#2A3142] bg-[#151922] px-3 font-mono text-[11px] uppercase tracking-wider text-[#7A8194] transition-colors hover:border-[#5B8CFF] hover:text-[#8EAFFF]"
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {filteredRows.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-[#3DDC97]" />
                  <div className="mt-3 text-sm font-medium text-[#E6E8EE]">No active alerts</div>
                  <div className="mt-1 max-w-md text-[12px] text-[#7A8194]">
                    Active incidents and operational alert matches will appear here automatically.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse">
                    <thead className="bg-[#0D0F15] text-left">
                      <tr className="border-b border-[#1F2330]">
                        {[
                          "Severity",
                          "Printer",
                          "Event",
                          "Status",
                          "Created At",
                          "Acknowledged",
                        ].map((column) => (
                          <th
                            key={column}
                            className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#525a6e]"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2330]/70">
                      {filteredRows.map((row) => {
                        const severity = SEVERITY_STYLES[row.severity];
                        const createdAt = safeDateParse(row.createdAt);
                        const canAck = !row.acknowledged && row.eventId != null;

                        return (
                          <tr
                            key={`${row.printer}-${row.eventType}`}
                            className="hover:bg-[#0e1017]"
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-sm border px-1.5 py-[2px] font-mono text-[10px] uppercase tracking-wider ${severity.className}`}
                              >
                                {severity.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[180px] truncate text-[13px] text-[#E6E8EE]">
                                {row.printer}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[340px]">
                                <div className="truncate text-[13px] text-[#E6E8EE]">
                                  {row.message}
                                </div>
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#525a6e]">
                                  {formatEventTypeLabel(row.eventType)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#FFB84D]">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-[#7A8194]">
                              {createdAt ? formatAbsoluteTime(createdAt) : "not recorded"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className={
                                    row.acknowledged
                                      ? "rounded-sm border border-[#3DDC9733] bg-[#3DDC9711] px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider text-[#3DDC97]"
                                      : "rounded-sm border border-[#FF5C5C33] bg-[#FF5C5C11] px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider text-[#FF8A8A]"
                                  }
                                >
                                  {row.acknowledged ? "ACKED" : "OPEN"}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canAck || acknowledgeMutation.isPending}
                                  title={
                                    row.matchState === "safe"
                                      ? "Acknowledge alert"
                                      : "ACK unavailable: no safe timeline event match"
                                  }
                                  onClick={() => {
                                    if (row.eventId != null)
                                      acknowledgeMutation.mutate(row.eventId);
                                  }}
                                  className="h-7 border border-[#2A3142] bg-[#151922] px-2 font-mono text-[10px] uppercase tracking-wider text-[#7A8194] transition-colors hover:border-[#3DDC97] hover:text-[#3DDC97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#2A3142] disabled:hover:text-[#7A8194]"
                                >
                                  ACK
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
