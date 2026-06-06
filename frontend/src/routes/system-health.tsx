import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { IncidentSummary } from "@/components/system-health/IncidentSummary";
import { fetchIncidentSummary } from "@/lib/api";

import { acknowledgeEvent } from "@/lib/api";

import { fetchHealth, fetchSnmpLatency, fetchSystemTelemetry } from "@/lib/api";
import { fetchTimeline } from "@/lib/api";

import { ActiveIncidents } from "@/components/system-health/ActiveIncidents";

import { fetchActiveIncidents } from "@/lib/api";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/AppSidebar";

import { Topbar } from "@/components/layout/Topbar";

import { OperationalTelemetryStrip } from "@/components/system-health/TopBar";
import { HealthCard } from "@/components/system-health/HealthCard";
import { FleetDonut } from "@/components/system-health/FleetDonut";
import { PollingMetrics } from "@/components/system-health/PollingMetrics";
import { SnmpLatencyChart } from "@/components/system-health/SnmpLatencyChart";
import { EventTimeline } from "@/components/system-health/EventTimeline";

import { useTelemetry } from "@/lib/system-health/telemetry";
import { safeDateParse } from "@/lib/time";
import { capTimelineEvents, groupEvents } from "@/lib/event-stream";

const SNMP_LATENCY_WINDOW_MINUTES = 30;
const SNMP_LATENCY_BUCKET_SECONDS = 60;

export const Route = createFileRoute("/system-health")({
  component: SystemHealthPage,
});

function SystemHealthPage() {
  const activeIncidentsQuery = useQuery({
    queryKey: ["active-incidents"],

    queryFn: fetchActiveIncidents,

    refetchInterval: 5_000,
  });

  const systemTelemetryQuery = useQuery({
    queryKey: ["system-telemetry"],

    queryFn: fetchSystemTelemetry,

    refetchInterval: 15_000,
  });

  const telemetry = useTelemetry(systemTelemetryQuery.data);

  const snmpLatencyQuery = useQuery({
    queryKey: ["snmp-latency", SNMP_LATENCY_WINDOW_MINUTES, SNMP_LATENCY_BUCKET_SECONDS],

    queryFn: () => fetchSnmpLatency(SNMP_LATENCY_WINDOW_MINUTES, SNMP_LATENCY_BUCKET_SECONDS),

    refetchInterval: 30_000,
  });

  const healthQuery = useQuery({
    queryKey: ["health"],

    queryFn: fetchHealth,

    refetchInterval: 15_000,
  });

  const timelineQuery = useQuery({
    queryKey: ["timeline"],

    queryFn: fetchTimeline,

    select: capTimelineEvents,

    refetchInterval: 30_000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeEvent,

    onSuccess: () => {
      timelineQuery.refetch();
    },
  });

  const incidentSummaryQuery = useQuery({
    queryKey: ["incident-summary"],

    queryFn: fetchIncidentSummary,

    refetchInterval: 30_000,
  });

  const onRefresh = () => {
    activeIncidentsQuery.refetch();
    systemTelemetryQuery.refetch();
    snmpLatencyQuery.refetch();
    healthQuery.refetch();
    timelineQuery.refetch();
    incidentSummaryQuery.refetch();
  };

  const refreshing =
    activeIncidentsQuery.isFetching ||
    systemTelemetryQuery.isFetching ||
    snmpLatencyQuery.isFetching ||
    healthQuery.isFetching ||
    timelineQuery.isFetching ||
    incidentSummaryQuery.isFetching;

  const timelineEvents = useMemo(
    () =>
      groupEvents(timelineQuery.data ?? []).map((event) => ({
        id: String(event.id),
        severity: event.severity,
        component: event.printer,
        message: event.message,
        eventType: event.event_type,
        category: event.category,
        groupCount: event.groupCount,
        groupLabel: event.groupLabel,
        ts: safeDateParse(event.created_at) ?? new Date(0),
        acknowledged: event.acknowledged,
      })),
    [timelineQuery.data],
  );

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <Topbar
          title="PrintOps"
          subtitle="System Health"
          health={healthQuery.data}
          healthLoading={healthQuery.isLoading}
          lastUpdated={systemTelemetryQuery.dataUpdatedAt}
          onRefresh={onRefresh}
          refreshing={refreshing}
          telemetry={
            <OperationalTelemetryStrip
              now={telemetry.now}
              bootedAt={telemetry.bootedAt}
              lastSync={telemetry.lastSync}
              global={telemetry.global}
              realtimeConnections={telemetry.realtimeConnections}
            />
          }
        />

        <div className="min-h-screen bg-[#0A0B0F] text-[#E6E8EE]">
          <main className="grid gap-4 p-4">
            <IncidentSummary
              summary={
                incidentSummaryQuery.data ?? {
                  active: 0,

                  unacknowledged: 0,

                  critical: 0,

                  recoveries_24h: 0,
                }
              }
            />

            <ActiveIncidents incidents={activeIncidentsQuery.data ?? []} />

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {(telemetry.services ?? []).map((service) => (
                <HealthCard key={service.id} service={service} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
              <FleetDonut fleet={telemetry.fleet} />

              <SnmpLatencyChart
                latency={
                  snmpLatencyQuery.data ?? {
                    available: false,
                    window_minutes: SNMP_LATENCY_WINDOW_MINUTES,
                    bucket_seconds: SNMP_LATENCY_BUCKET_SECONDS,
                    points: [],
                    reason: snmpLatencyQuery.isError
                      ? "Unable to load SNMP latency samples."
                      : "Loading SNMP latency samples.",
                  }
                }
                loading={snmpLatencyQuery.isLoading}
              />
            </section>

            <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[320px_1fr]">
              <PollingMetrics
                polling={{
                  discoveryStatus: telemetry.polling.discoveryStatus,

                  lastRun: telemetry.polling.lastRun,

                  nextRunAt: telemetry.polling.nextRunAt,

                  nextRunInMs: telemetry.polling.nextRunInMs,

                  cycleSec: telemetry.polling.cycleSec,

                  targets: telemetry.polling.targets,

                  successRate: telemetry.polling.successRate,

                  lastDiscoveryScan: telemetry.polling.lastDiscoveryScan,
                }}
              />

              <EventTimeline events={timelineEvents} acknowledgeMutation={acknowledgeMutation} />
            </section>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
