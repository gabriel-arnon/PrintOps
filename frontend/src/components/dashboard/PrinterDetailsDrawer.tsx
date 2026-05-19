import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Activity, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { formatDistanceToNow } from "date-fns" 
import { ptBR } from "date-fns/locale"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RelativeTime } from "@/components/RelativeTime";
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  axisTickX,
  axisTickY,
  chartAnimation,
  chartGrid,
  chartMargins,
  historyLineColors,
  lineTooltipCursor,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";
import { getTonerLevel, tonerTextClass } from "@/lib/toner";
import {formatRelativeToNow, formatShortClockTime, formatRelativeOperationalTime} from "@/lib/time";
import {
  fetchPrinterDetails,
  fetchPrinterHistory,
  fetchPrinterEvents,
  fetchPrinterStats,
  type PrinterHistoryPoint,
} from "@/lib/api";

interface Props {
  printerId: number | null;
  lastUpdate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const nf = new Intl.NumberFormat("pt-BR");

function ConsumableBar({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const level = getTonerLevel(clamped);
  const fill =
    level === "ok"
      ? "bg-[oklch(0.72_0.17_152)]"
      : level === "warn"
        ? "bg-[oklch(0.78_0.16_75)]"
        : "bg-[oklch(0.62_0.22_25)]";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("text-2xl font-semibold tabular-nums", tonerTextClass[level])}>
          {clamped}%
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function HistoryChart({
  data,
  dataKey,
  color,
}: {
  data: PrinterHistoryPoint[];
  dataKey: "toner_percent" | "image_unit_percent";
  color: string;
}) {
  if (data.length < 2) {
    return (
      <ChartEmptyState
        className="min-h-[160px] py-8 ring-border/20"
        title="Série temporal indisponível"
        hint="São necessárias pelo menos duas leituras para traçar a tendência neste intervalo."
      />
    );
  }
  const formatted = data.map((d) => ({
    ...d,
    time: formatShortClockTime(d.created_at),
    relative: formatRelativeToNow(d.created_at),
  }));
  const valueLabel = dataKey === "toner_percent" ? "Toner" : "Unidade de imagem";

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={chartMargins.line}>
          <CartesianGrid {...chartGrid} vertical={false} />
          <XAxis
            dataKey="time"
            tick={axisTickX}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            dy={4}
          />
          <YAxis domain={[0, 100]} tick={axisTickY} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            cursor={lineTooltipCursor}
            animationDuration={180}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(_l, payload) => {
              const p = payload?.[0]?.payload as { relative?: string } | undefined;
              return p?.relative ?? "";
            }}
            formatter={(v: number) => [`${v}%`, valueLabel]}
            wrapperStyle={{ outline: "none" }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{
              r: 3.5,
              strokeWidth: 1,
              stroke: "oklch(0.22 0.016 250 / 0.75)",
              fill: color,
              fillOpacity: 0.92,
            }}
            animationDuration={chartAnimation.lineDuration}
            animationEasing={chartAnimation.easing}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}



function TechRow({ label, value, valueClassName, }: { label: string; value: string; valueClassName?: string; }) { return ( <div className="flex items-center justify-between gap-4 py-1.5"> <span className="text-xs uppercase tracking-wide text-muted-foreground"> {label} </span> <span className={cn( "font-mono text-xs", valueClassName )} > {value} </span> </div> ); }

export function PrinterDetailsDrawer({ printerId, lastUpdate, open, onOpenChange }: Props) {
  const [techOpen, setTechOpen] = useState(false);
  const enabled = open && printerId != null;

  const detailsQ = useQuery({
    queryKey: ["printer", printerId, "details"],
    queryFn: () => fetchPrinterDetails(printerId as number),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
  });

  const historyQ = useQuery({
    queryKey: ["printer", printerId, "history"],
    queryFn: () => fetchPrinterHistory(printerId as number),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
  });

  const statsQ = useQuery({
    queryKey: ["printer", printerId, "stats"],
    queryFn: () => fetchPrinterStats(printerId as number),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
  });

 
const eventsQ = useQuery({

  queryKey: ["printer", printerId, "events"],

  queryFn: () =>
    fetchPrinterEvents(printerId as number),

  enabled,

  staleTime: 1000 * 30,

  placeholderData: (prev) => prev,

});
 


  const d = detailsQ.data;
  const limitedHistory = (historyQ.data ?? []).slice(-50);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border/60 bg-card/95 p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-3 border-b border-border/60 p-6">
          {detailsQ.isLoading && !d ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-7 w-28" />
            </div>
          ) : d ? (
            <>
              <SheetTitle className="text-xl font-semibold">{d.name}</SheetTitle>
              <div className="text-sm text-muted-foreground">
                {d.model} · <span className="font-mono">{d.ip}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StatusBadge status={d.status} size="md" />
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Uptime: {d.uptime}
                </span>
                {lastUpdate ? ( <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"> <Clock className="h-3.5 w-3.5" /> 
                Última leitura: { formatRelativeOperationalTime( lastUpdate ) } </span> ) : null}
              </div>
            </>
          ) : (
            <SheetTitle className="text-xl font-semibold">Impressora</SheetTitle>
          )}
        </SheetHeader>

        <div className="space-y-6 p-6">
          {/* Consumíveis */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Consumíveis
            </h3>
            {detailsQ.isLoading && !d ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : d ? (
              <div className="space-y-5">
                <ConsumableBar label="Toner" percent={d.toner_percent} />
                <ConsumableBar label="Unidade de Imagem" percent={d.image_unit_percent} />
              </div>
            ) : detailsQ.error ? (
              <p className="text-xs text-destructive">Falha ao carregar detalhes.</p>
            ) : null}
          </section>

          {/* Estatísticas */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estatísticas
            </h3>
            {statsQ.isLoading && !statsQ.data ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Páginas hoje"
                  value={statsQ.data ? nf.format(statsQ.data.pages_today) : "—"}
                />
                <StatCard
                  label="Últimos 7 dias"
                  value={statsQ.data ? nf.format(statsQ.data.pages_week) : "—"}
                />
                <StatCard
                  label="Média diária"
                  value={statsQ.data ? nf.format(statsQ.data.daily_average) : "—"}
                />
                <StatCard label="Total" value={d ? nf.format(d.pages) : "—"} />
              </div>
            )}
          </section>

          {/* Histórico */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Histórico
            </h3>
            {historyQ.isLoading && !historyQ.data ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Toner %</div>
                  <HistoryChart
                    data={limitedHistory}
                    dataKey="toner_percent"
                    color={historyLineColors.toner}
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Unidade de Imagem %</div>
                  <HistoryChart
                    data={limitedHistory}
                    dataKey="image_unit_percent"
                    color={historyLineColors.imageUnit}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Operational History */}

          <section className="space-y-4">

            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">

              <Activity className="h-3.5 w-3.5" />

              Operational History

            </h3>

            {eventsQ.isLoading && !eventsQ.data ? (

              <div className="space-y-2">

                {Array.from({ length: 4 }).map((_, i) => (

                  <Skeleton
                    key={i}
                    className="h-12 w-full"
                  />

                ))}

              </div>

            ) : (

              <div className="overflow-hidden rounded-lg border border-border/60 bg-card/40">

                {(eventsQ.data ?? []).map((event: any) => {

                  const color =

                    event.severity === "error"
                      ? "#FF5D73"
                      : event.severity === "warn"
                        ? "#FFB84D"
                        : "#3DDC97";

                  return (

                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-0",
                        event.acknowledged && "opacity-50"
                      )}
                    >

                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: color }}
                      />

                      <div className="min-w-0 flex-1">

                        <div className="truncate text-sm text-foreground">

                          {event.message}

                        </div>

                        <div className="mt-1 text-[11px] text-muted-foreground">

                          {formatDistanceToNow(
                            new Date(event.created_at),
                            {
                              addSuffix: true,
                              locale: ptBR,
                            }
                          )}

                        </div>

                      </div>

                      {event.acknowledged ? (

                        <span className="rounded border border-[#3DDC9733] bg-[#3DDC9711] px-1.5 py-[2px] text-[10px] font-mono uppercase tracking-wider text-[#3DDC97]">

                          ACKED

                        </span>

                      ) : (

                        <span
                          className="rounded px-1.5 py-[2px] text-[10px] font-mono uppercase tracking-wider"
                          style={{
                            color,
                            background: `${color}11`,
                            border: `1px solid ${color}33`,
                          }}
                        >

                          {event.severity}

                        </span>

                      )}

                    </div>

                  );

                })}

              </div>

            )}

          </section>

          {/* Informações técnicas */}
          <Collapsible open={techOpen} onOpenChange={setTechOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/60 px-4 py-2.5 text-sm font-medium hover:bg-muted/30">
              Informações técnicas
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", techOpen && "rotate-180")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border border-border/60 bg-card/40 px-4 py-2">
              {d ? (
                <>
                  <TechRow label="Serial" value={d.serial} />
                  <TechRow label="Hostname" value={d.hostname} />
                  <TechRow label="MAC" value={d.mac} />
                  <TechRow label="Firmware" value={d.firmware} />
                  <TechRow label="Uptime" value={d.uptime || "N/A"} />
                  <TechRow label="Last Polling" value={ d.last_update ? formatRelativeOperationalTime( new Date(d.last_update), { addSuffix: true, locale: ptBR, } ) : "N/A" } />
                  {"interface_status" in d ? (
                    <TechRow
                      label="Network Interface"
                      value={
                        typeof d.interface_status === "string"
                          ? d.interface_status.toUpperCase()
                          : "UNKNOWN"
                      }
                      valueClassName={
                        d.interface_status === "up"
                          ? "text-green-400"
                          : d.interface_status === "down"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }
                    />
                  ) : null}
            
             
                </>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">Sem dados.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
