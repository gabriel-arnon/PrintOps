import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Printer } from "@/lib/api";

export function TopPagesChart({ printers, top = 7 }: { printers: Printer[]; top?: number }) {
  const data = [...printers]
    .sort((a, b) => b.pages - a.pages)
    .slice(0, top)
    .map((p) => ({ name: p.printer, pages: p.pages }));

  return (
    <Card className="animate-slide-up border-border/60 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top impressoras por páginas</CardTitle>
        <p className="text-xs text-muted-foreground">Volume total impresso</p>
      </CardHeader>
      <CardContent className="h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="pagesFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="oklch(0.72 0.17 220)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="oklch(0.65 0.20 290)" stopOpacity={0.95} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.30 0.018 250)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "oklch(0.92 0.005 250)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.27 0.018 250 / 0.4)" }}
              contentStyle={{
                background: "oklch(0.22 0.015 250)",
                border: "1px solid oklch(0.30 0.018 250)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "oklch(0.97 0.003 250)" }}
              formatter={(v: number) => [v.toLocaleString("pt-BR"), "Páginas"]}
            />
            <Bar dataKey="pages" fill="url(#pagesFill)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
