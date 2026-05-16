import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTonerLevel } from "@/lib/toner";
import type { Printer } from "@/lib/api";

const colorFor = (p: number) => {
  const l = getTonerLevel(p);
  if (l === "ok") return "oklch(0.72 0.17 152)";
  if (l === "warn") return "oklch(0.78 0.16 75)";
  return "oklch(0.62 0.22 25)";
};

export function ImageUnitChart({ printers }: { printers: Printer[] }) {
  const data = printers.map((p) => ({
    name: p.printer,
    image_unit: p.image_unit_percent,
  }));

  return (
    <Card className="animate-slide-up border-border/60 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4 text-primary" />
          Saúde da Unidade de Imagem
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verde &gt; 40% · Amarelo 20–40% · Vermelho &lt; 20%
        </p>
      </CardHeader>
      <CardContent className="h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="oklch(0.30 0.018 250)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: "oklch(0.27 0.018 250 / 0.4)" }}
              contentStyle={{
                background: "oklch(0.22 0.015 250)",
                border: "1px solid oklch(0.30 0.018 250)",
                borderRadius: 8,
                fontSize: 12,
                color: "white",
              }}
              labelStyle={{ color: "white" }}
              itemStyle={{ color: "white" }}
              formatter={(v: number) => [`${v}%`, "Unidade de Imagem"]}
            />
            <Bar dataKey="image_unit" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(d.image_unit)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
