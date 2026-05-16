import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTonerLevel } from "@/lib/toner";
import type { Printer } from "@/lib/api";

const colorFor = (p: number) => {
  const l = getTonerLevel(p);
  if (l === "ok") return "oklch(0.72 0.17 152)";
  if (l === "warn") return "oklch(0.78 0.16 75)";
  return "oklch(0.62 0.22 25)";
};

export function TonerChart({ printers }: { printers: Printer[] }) {
  const data = printers.map((p) => ({
    name: p.printer,
    toner: p.toner_percent,
  }));

  return (
    <Card className="animate-slide-up border-border/60 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Nível de toner por impressora</CardTitle>
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
              cursor={{
                fill: "oklch(0.22 0.02 250 / 0.15)", // bem mais sutil e suave
                radius: 4,
              }}
              contentStyle={{
                background: "oklch(0.18 0.015 250 / 0.85)", // escuro, sem preto puro, com sutil transparência
                border: "1px solid var(--border-border, oklch(0.30 0.018 250 / 0.32))", // respeita tema border
                borderRadius: 12,
                fontFamily: "Inter, 'Segoe UI', 'Arial', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: "oklch(0.97 0.01 250)",
                padding: "0.7em 1.1em 0.6em 1.1em",
                boxShadow:
                  "0 4px 24px 0 oklch(0.13 0.015 250 / 0.16), 0 1.5px 4px 0 oklch(0.13 0.015 250 / 0.06)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                minWidth: 110,
              }}
              labelStyle={{
                color: "oklch(0.97 0.01 250)",
                fontSize: 13,
                marginBottom: 2,
                letterSpacing: "0.01em",
                fontWeight: 600,
                lineHeight: 1.25
              }}
              itemStyle={{
                color: "oklch(0.87 0.015 250)",
                fontSize: 13,
                fontWeight: 500,
                marginTop: 4,
                letterSpacing: "0.01em",
                lineHeight: 1.35,
              }}
              formatter={(v: number) => [
                <span style={{ fontWeight: 600, letterSpacing: "0.01em" }}>{v}%</span>,
                <span style={{ opacity: 0.8 }}>Toner</span>
              ]}
              wrapperStyle={{
                pointerEvents: "auto", // hover/cursor mais suave
                transition: "box-shadow 0.18s cubic-bezier(.5,.19,.08,1.13)"
              }}
            />
      
            <Bar dataKey="toner" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(d.toner)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
