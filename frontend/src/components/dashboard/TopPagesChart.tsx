import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState";
import type { Printer } from "@/lib/api";
import {
  axisTickX,
  axisTickY,
  chartAnimation,
  barTooltipCursor,
  chartGrid,
  chartMargins,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";

export function TopPagesChart({ printers, top = 7 }: { printers: Printer[]; top?: number }) {
  const gradientId = `pagesFillObs-${useId().replace(/:/g, "")}`;

  const data = [...printers]
    .sort((a, b) => b.pages - a.pages)
    .slice(0, top)
    .map((p) => ({ name: p.printer, pages: p.pages }));

  return (
    <Card className="animate-slide-up border-border/60 bg-card/80">
      <CardHeader className="space-y-1.5 pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Top impressoras por páginas
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">Volume total impresso</p>
      </CardHeader>
      <CardContent className="h-72 px-1 pb-3 pt-0">
        {data.length === 0 ? (
          <ChartEmptyState
            title="Ranking indisponível"
            hint="Quando houver contagem de páginas na frota, o ranking por volume aparecerá aqui."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={chartMargins.barVertical}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="oklch(0.58 0.11 230)" stopOpacity={0.88} />
                  <stop offset="100%" stopColor="oklch(0.55 0.10 280)" stopOpacity={0.82} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartGrid} horizontal={false} />
              <XAxis type="number" tick={axisTickX} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...axisTickY, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={118}
              />
              <Tooltip
                cursor={{ ...barTooltipCursor, fill: "oklch(0.26 0.018 250 / 0.04)" }}
                animationDuration={200}
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Páginas"]}
                wrapperStyle={{ outline: "none" }}
              />
              <Bar
                dataKey="pages"
                fill={`url(#${gradientId})`}
                radius={[0, 5, 5, 0]}
                maxBarSize={22}
                animationDuration={chartAnimation.barDuration}
                animationEasing={chartAnimation.easing}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
