import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Gauge,
  PackageCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  fetchAnalyticsSummary,
  fetchHealth,
  fetchIncidentSummary,
  type AnalyticsAvailabilityItem,
  type AnalyticsConsumableRiskItem,
  type AnalyticsMostUsedPrinter,
  type AnalyticsMtbfItem,
  type AnalyticsMttrItem,
  type AnalyticsProblemPrinter,
} from "@/lib/api";
import {
  axisTickX,
  axisTickY,
  barTooltipCursor,
  chartAnimation,
  chartGrid,
  chartMargins,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";
import { formatAbsoluteTime } from "@/lib/time";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";

  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatGrowth(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  if (value === 0) return "0%";

  const formatted = Math.abs(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });

  return `${value > 0 ? "+" : "-"}${formatted}%`;
}

function formatDays(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "insufficient data";

  if (value < 1) {
    const hours = Math.max(1, Math.round(value * 24));

    return `${hours}h`;
  }

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} days`;
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-");

  if (!year || !month) return value;

  return `${month}/${year.slice(2)}`;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center border border-dashed border-[#2A3142] bg-[#0A0B0F]/50 px-4 text-center text-sm text-[#7A8194]">
      {label}
    </div>
  );
}

function SectionCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center gap-3 border-b border-[#1F2330] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center border border-[#2A3142] bg-[#0A0B0F]">
          <Icon className="h-4 w-4 text-[#5B8CFF]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#E6E8EE]">{title}</h2>
          <p className="text-xs text-[#7A8194]">{description}</p>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  tone = "#8EAFFF",
  value,
}: {
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className="border border-[#1F2330] bg-[#11131A] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold tabular-nums" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function SmallTable({
  children,
  emptyLabel,
  title,
}: {
  children: ReactNode;
  emptyLabel: string;
  title: string;
}) {
  return (
    <div className="border border-[#1F2330] bg-[#0A0B0F]/45">
      <div className="border-b border-[#1F2330] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A8194]">
        {title}
      </div>
      {children ? children : <EmptyState label={emptyLabel} />}
    </div>
  );
}

function ProblematicPrintersTable({ rows }: { rows: AnalyticsProblemPrinter[] }) {
  if (rows.length === 0) return <EmptyState label="No incident history in this window." />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm text-[#E6E8EE]">{row.printer}</span>
          <span className="font-mono text-sm tabular-nums text-[#FF8A8A]">{row.incidents}</span>
        </div>
      ))}
    </div>
  );
}

function MttrTable({ rows }: { rows: AnalyticsMttrItem[] }) {
  if (rows.length === 0) return <EmptyState label="No offline to recovery pairs found." />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm text-[#E6E8EE]">{row.printer}</div>
            <div className="text-[11px] text-[#7A8194]">{row.recoveries} recoveries</div>
          </div>
          <span className="font-mono text-sm tabular-nums text-[#F5A524]">
            {row.avg_recovery_time}
          </span>
        </div>
      ))}
    </div>
  );
}

function MtbfTable({ rows }: { rows: AnalyticsMtbfItem[] }) {
  if (rows.length === 0) return <EmptyState label="No repeated incidents found." />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm text-[#E6E8EE]">{row.printer}</div>
            <div className="text-[11px] text-[#7A8194]">{row.incidents} incidents</div>
          </div>
          <span className="font-mono text-sm tabular-nums text-[#8EAFFF]">
            {row.avg_between_failures}
          </span>
        </div>
      ))}
    </div>
  );
}

function AvailabilityTable({ rows }: { rows: AnalyticsAvailabilityItem[] }) {
  if (rows.length === 0) return <EmptyState label="No polling samples found." />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm text-[#E6E8EE]">{row.printer}</div>
            <div className="text-[11px] text-[#7A8194]">{row.samples} samples</div>
          </div>
          <span className="font-mono text-sm tabular-nums text-[#3DDC97]">
            {formatPercent(row.availability_percent)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RiskTable({ label, rows }: { label: string; rows: AnalyticsConsumableRiskItem[] }) {
  if (rows.length === 0) return <EmptyState label={`No ${label.toLowerCase()} samples found.`} />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid gap-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-[#E6E8EE]">{row.printer}</span>
            <span className="font-mono text-sm tabular-nums text-[#E6E8EE]">
              {formatPercent(row.current_percent)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-[#7A8194]">
            <span>{formatDays(row.predicted_depletion_days)}</span>
            <span>{row.daily_consumption_rate.toFixed(3)}%/day</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MostUsedTable({ rows }: { rows: AnalyticsMostUsedPrinter[] }) {
  if (rows.length === 0) return <EmptyState label="No page deltas found." />;

  return (
    <div className="divide-y divide-[#1F2330]">
      {rows.map((row) => (
        <div key={row.printer_id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm text-[#E6E8EE]">{row.printer}</span>
          <span className="font-mono text-sm tabular-nums text-[#8EAFFF]">
            {formatNumber(row.pages_printed)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthlyConsumptionChart({
  data,
}: {
  data: Array<{ image_unit: number; month: string; toner: number }>;
}) {
  if (data.length === 0) return <EmptyState label="No monthly consumable consumption found." />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((point) => ({ ...point, label: formatMonth(point.month) }))}
          margin={chartMargins.line}
        >
          <CartesianGrid {...chartGrid} />
          <XAxis dataKey="label" tick={axisTickX} tickLine={false} axisLine={false} />
          <YAxis tick={axisTickY} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            animationDuration={200}
            contentStyle={tooltipContentStyle}
            cursor={false}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
            wrapperStyle={{ outline: "none" }}
            formatter={(value: number | string, name: string) => [
              `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% consumed`,
              name === "toner" ? "Toner" : "Image unit",
            ]}
            labelFormatter={(label) => `Month ${label}`}
          />
          <Line
            dataKey="toner"
            dot={{ r: 2 }}
            stroke="#3DDC97"
            strokeWidth={2}
            type="monotone"
            animationDuration={chartAnimation.lineDuration}
            animationEasing={chartAnimation.easing}
          />
          <Line
            dataKey="image_unit"
            dot={{ r: 2 }}
            stroke="#5B8CFF"
            strokeWidth={2}
            type="monotone"
            animationDuration={chartAnimation.lineDuration}
            animationEasing={chartAnimation.easing}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PeakHoursChart({ data }: { data: Array<{ hour: number; pages_printed: number }> }) {
  const hasData = data.some((point) => point.pages_printed > 0);

  if (!hasData) return <EmptyState label="No hourly page volume found." />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.map((point) => ({
            ...point,
            label: `${String(point.hour).padStart(2, "0")}h`,
          }))}
          margin={chartMargins.bar}
        >
          <CartesianGrid {...chartGrid} vertical={false} />
          <XAxis dataKey="label" interval={2} tick={axisTickX} tickLine={false} axisLine={false} />
          <YAxis tick={axisTickY} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            animationDuration={200}
            contentStyle={tooltipContentStyle}
            cursor={barTooltipCursor}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
            wrapperStyle={{ outline: "none" }}
            formatter={(value: number | string) => [
              Number(value).toLocaleString("pt-BR"),
              "Pages printed",
            ]}
            labelFormatter={(label) => `Hour ${label}`}
          />
          <Bar
            dataKey="pages_printed"
            fill="#5B8CFF"
            radius={[5, 5, 0, 0]}
            maxBarSize={18}
            animationDuration={chartAnimation.barDuration}
            animationEasing={chartAnimation.easing}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnalyticsPage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
  });

  const incidentSummaryQuery = useQuery({
    queryKey: ["incident-summary"],
    queryFn: fetchIncidentSummary,
    refetchInterval: 30_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: fetchAnalyticsSummary,
    refetchInterval: 120_000,
  });

  const summary = incidentSummaryQuery.data ?? {
    active: 0,
    critical: 0,
    recoveries_24h: 0,
    unacknowledged: 0,
  };

  const analytics = analyticsQuery.data;

  const refreshAnalytics = () => {
    analyticsQuery.refetch();
    incidentSummaryQuery.refetch();
    healthQuery.refetch();
  };

  const refreshing =
    analyticsQuery.isFetching || incidentSummaryQuery.isFetching || healthQuery.isFetching;

  return (
    <SidebarProvider>
      <AppSidebar alertCount={summary.active} />

      <SidebarInset>
        <Topbar
          title="Analytics"
          subtitle="Historical reliability, consumables, and capacity insights"
          health={healthQuery.data}
          healthLoading={healthQuery.isLoading}
          lastUpdated={analyticsQuery.dataUpdatedAt}
          onRefresh={refreshAnalytics}
          refreshing={refreshing}
        />

        <div className="min-h-screen bg-[#0A0B0F] text-[#E6E8EE]">
          <main className="grid gap-4 p-4">
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard
                label="Pages 7d"
                value={formatNumber(analytics?.capacity.print_volume.days_7)}
              />
              <MetricCard
                label="Pages 30d"
                tone="#3DDC97"
                value={formatNumber(analytics?.capacity.print_volume.days_30)}
              />
              <MetricCard
                label="Pages 90d"
                tone="#5B8CFF"
                value={formatNumber(analytics?.capacity.print_volume.days_90)}
              />
              <MetricCard
                label="Incident Growth"
                tone="#F5A524"
                value={formatGrowth(analytics?.capacity.growth.incident_percent)}
              />
            </section>

            {analyticsQuery.isError && (
              <div className="border border-[#FF5C5C33] bg-[#FF5C5C11] px-4 py-3 text-sm text-[#FF8A8A]">
                Unable to load analytics summary.
              </div>
            )}

            <SectionCard
              description="Last 30 days from incidents and polling samples"
              icon={Activity}
              title="Reliability Analytics"
            >
              <div className="grid gap-4 xl:grid-cols-4">
                <SmallTable emptyLabel="No incidents found." title="Top Problematic Printers">
                  {analytics && (
                    <ProblematicPrintersTable rows={analytics.reliability.top_problematic} />
                  )}
                </SmallTable>
                <SmallTable emptyLabel="No recoveries found." title="MTTR">
                  {analytics && <MttrTable rows={analytics.reliability.mttr} />}
                </SmallTable>
                <SmallTable emptyLabel="No repeated failures found." title="MTBF">
                  {analytics && <MtbfTable rows={analytics.reliability.mtbf} />}
                </SmallTable>
                <SmallTable emptyLabel="No availability samples found." title="Availability">
                  {analytics && <AvailabilityTable rows={analytics.reliability.availability} />}
                </SmallTable>
              </div>
            </SectionCard>

            <SectionCard
              description="Last 90 days using positive consumable drops only"
              icon={PackageCheck}
              title="Consumable Analytics"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.35fr]">
                <SmallTable emptyLabel="No toner samples found." title="Toner Risk">
                  {analytics && <RiskTable label="Toner" rows={analytics.consumables.toner_risk} />}
                </SmallTable>
                <SmallTable emptyLabel="No image unit samples found." title="Image Unit Risk">
                  {analytics && (
                    <RiskTable label="Image unit" rows={analytics.consumables.image_unit_risk} />
                  )}
                </SmallTable>
                <SmallTable emptyLabel="No monthly trend found." title="Monthly Consumption">
                  {analytics && (
                    <MonthlyConsumptionChart data={analytics.consumables.monthly_consumption} />
                  )}
                </SmallTable>
              </div>
            </SectionCard>

            <SectionCard
              description="Last 90 days with guarded positive page deltas"
              icon={Gauge}
              title="Capacity Analytics"
            >
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <MetricCard
                  label="Page Volume Growth"
                  tone="#3DDC97"
                  value={formatGrowth(analytics?.capacity.growth.page_volume_percent)}
                />
                <MetricCard
                  label="Generated At"
                  tone="#8EAFFF"
                  value={
                    analytics?.generated_at ? formatAbsoluteTime(analytics.generated_at) : "Loading"
                  }
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <SmallTable emptyLabel="No usage found." title="Most Used Printers">
                  {analytics && <MostUsedTable rows={analytics.capacity.most_used} />}
                </SmallTable>
                <SmallTable emptyLabel="No peak hour data found." title="Peak Hours">
                  {analytics && <PeakHoursChart data={analytics.capacity.peak_hours} />}
                </SmallTable>
              </div>
            </SectionCard>

            {!analytics && analyticsQuery.isLoading && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {[AlertTriangle, Clock3, TrendingUp].map((Icon, index) => (
                  <div key={index} className="border border-[#1F2330] bg-[#11131A] p-4">
                    <Icon className="h-4 w-4 text-[#5B8CFF]" />
                    <div className="mt-4 h-3 w-28 bg-[#1F2330]" />
                    <div className="mt-3 h-8 w-40 bg-[#1F2330]" />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
