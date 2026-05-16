import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wrench } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState";
import type { Printer } from "@/lib/api";
import {
  axisTickX,
  axisTickY,
  chartAnimation,
  barFillForPercent,
  barTooltipCursor,
  chartGrid,
  chartMargins,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";

export function ImageUnitChart({ printers }: { printers: Printer[] }) {
  const data = printers.map((p) => ({
    name: p.printer,
    image_unit: p.image_unit_percent,
  }));

  return (
    <Card className="animate-slide-up border-border/60 bg-card/80">
      <CardHeader className="space-y-1.5 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Wrench className="h-4 w-4 shrink-0 text-primary/90" strokeWidth={1.75} />
          Saúde da Unidade de Imagem
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Verde &gt; 40% · Amarelo 20–40% · Vermelho &lt; 20%
        </p>
      </CardHeader>
      <CardContent className="h-72 px-1 pb-3 pt-0">
        {data.length === 0 ? (
          <ChartEmptyState
            title="Painel sem amostras"
            hint="Adicione impressoras ou aguarde a primeira varredura para visualizar o desgaste da unidade de imagem."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={chartMargins.bar}>
              <CartesianGrid {...chartGrid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={axisTickX}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={58}
                dy={6}
              />
              <YAxis
                tick={axisTickY}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
                width={34}
              />
              <Tooltip
                cursor={barTooltipCursor}
                animationDuration={200}
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value: number) => [`${value}%`, "Unidade de imagem"]}
                wrapperStyle={{ outline: "none" }}
              />
              <Bar
                dataKey="image_unit"
                radius={[5, 5, 0, 0]}
                maxBarSize={52}
                animationDuration={chartAnimation.barDuration}
                animationEasing={chartAnimation.easing}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={barFillForPercent(entry.image_unit)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
