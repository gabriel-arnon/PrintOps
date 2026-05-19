import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
 
import { IncidentSummary } from "@/components/system-health/IncidentSummary"; 
import { fetchIncidentSummary } from "@/lib/api";
 
import { acknowledgeEvent } from "@/lib/api";
 

import { fetchSystemHealth } from "@/lib/api";
import { fetchTimeline } from "@/lib/api";


import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/AppSidebar";

import { Topbar } from "@/components/layout/Topbar";

import { TopBar } from "@/components/system-health/TopBar";
import { HealthCard } from "@/components/system-health/HealthCard";
import { FleetDonut } from "@/components/system-health/FleetDonut";
import { PollingMetrics } from "@/components/system-health/PollingMetrics";
import { SnmpLatencyChart } from "@/components/system-health/SnmpLatencyChart";
import { EventTimeline } from "@/components/system-health/EventTimeline";

import {
  useTelemetry,
} from "@/lib/system-health/telemetry";

import { fetchDashboard } from "@/lib/api";
import { ok } from "assert";

export const Route = createFileRoute(
  "/system-health"
)({
  component: SystemHealthPage,
});

function SystemHealthPage() {

  const telemetry = useTelemetry();

  const dashboardQuery = useQuery({

    queryKey: ["dashboard"],

    queryFn: fetchDashboard,

    refetchInterval: 30_000,

  });

 
const healthQuery = useQuery({

  queryKey: ["system-health"],

  queryFn: fetchSystemHealth,

  refetchInterval: 30_000,

});

 
const timelineQuery = useQuery({

  queryKey: ["timeline"],

  queryFn: fetchTimeline,

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
 



'###console.log("HEALTH QUERY", healthQuery);'


  const printers = dashboardQuery.data ?? [];

  const fleet = {

    online: printers.filter(
      (p: any) => p.status === "online"
    ).length,

    offline: printers.filter(
      (p: any) => p.status === "offline"
    ).length,

    degraded: 0,

  };

  return (

 
    <SidebarProvider>

      <AppSidebar />

      <SidebarInset>

        <Topbar />

        <div className="min-h-screen bg-[#0A0B0F] text-[#E6E8EE]">

          <TopBar
            now={telemetry.now}
            bootedAt={telemetry.bootedAt}
            lastSync={telemetry.lastSync}
            global={telemetry.global}
          />

          <main className="grid gap-4 p-4">

            <IncidentSummary
              summary={incidentSummaryQuery.data ?? {

                active: 0,

                unacknowledged: 0,

                critical: 0,

                recoveries_24h: 0,

              }}
            />

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">

              {(telemetry.services ?? []).map((service) => (

                <HealthCard
                  key={service.id}
                  service={service}
                />

              ))}

            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">

              <FleetDonut fleet={fleet} />

              <SnmpLatencyChart
                data={telemetry.latency ?? []}
              />

            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">

              <PollingMetrics
                polling={{
                  discoveryStatus:
                    healthQuery.data?.discovery_status === "ok"
                      ? "ok"
                      : healthQuery.data?.discovery_status === "warn"
                        ? "warn"
                        : healthQuery.data?.discovery_status === "error"
                          ? "error"
                          : "ok",

                  lastRun: healthQuery.data?.last_run
                    ? new Date(healthQuery.data.last_run)
                    : new Date(),

                  nextRunInSec:
                    healthQuery.data?.cycle_sec ?? 60,

                  cycleSec:
                    healthQuery.data?.cycle_sec ?? 60,

                  targets:
                    healthQuery.data?.targets ?? 0,

                  successRate:
                    healthQuery.data?.success_rate ?? 0,

                  lastDiscoveryScan:
                    healthQuery.data?.last_discovery_scan
                      ? new Date(
                          healthQuery.data.last_discovery_scan
                        )
                      : new Date(),
                }}
              />

              <EventTimeline

                events={(timelineQuery.data ?? []).map((event) => ({

                  id: String(event.id),

                  severity: event.severity,

                  component: event.printer,

                  message: event.message,

                  ts: new Date(event.created_at),

                  acknowledged: event.acknowledged,

                }))}

                acknowledgeMutation={acknowledgeMutation}

              />

            </section>

          </main>

        </div>

      </SidebarInset>

    </SidebarProvider>
 


  );

}
 
