import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TonerChart } from "@/components/dashboard/TonerChart";
import { ImageUnitChart } from "@/components/dashboard/ImageUnitChart";
import { PrintersTable } from "@/components/dashboard/PrintersTable";
import { Toaster } from "@/components/ui/sonner";
import { fetchDashboard, fetchHealth } from "@/lib/api";
 

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

 
function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  const authed = isAuthenticated();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
    enabled: authed,
  });

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
    enabled: authed,
  });

  const printers = dashboardQuery.data ?? [];
  const alertCount = printers.filter(
    (p) => p.status === "offline" || p.toner_percent < 20,
  ).length;

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["health"] });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar alertCount={alertCount} />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title="Dashboard"
            subtitle="Monitoramento em tempo real da frota de impressoras"
            health={healthQuery.data}
            healthLoading={healthQuery.isLoading}
            lastUpdated={dashboardQuery.dataUpdatedAt}
            onRefresh={onRefresh}
            refreshing={dashboardQuery.isFetching || healthQuery.isFetching}
          />

          <main className="flex-1 space-y-5 px-4 py-5 md:px-6 md:py-6">
            <div className="animate-fade-in">
              <SummaryCards printers={printers} loading={dashboardQuery.isLoading} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TonerChart printers={printers} />
              <ImageUnitChart printers={printers} />
            </div>

            <PrintersTable printers={printers} loading={dashboardQuery.isLoading} />

            <footer className="pt-4 text-center text-xs text-muted-foreground">
              PrintOps · Pronto para conexão com FastAPI via{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                VITE_API_URL
              </code>
            </footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
