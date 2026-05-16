import { Printer as PrinterIcon, Wifi, WifiOff, Droplet, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Printer } from "@/lib/api";

interface SummaryCardsProps {
  printers: Printer[];
  loading?: boolean;
}

export function SummaryCards({ printers, loading }: SummaryCardsProps) {
  const total = printers.length;
  const online = printers.filter((p) => p.status === "online").length;
  const offline = total - online;
  const tonerCritical = printers.filter((p) => p.toner_percent < 10).length;
  const imageCritical = printers.filter((p) => p.image_unit_percent < 10).length;
  const avgToner =
    total > 0 ? Math.round(printers.reduce((s, p) => s + p.toner_percent, 0) / total) : 0;

  const cards = [
    {
      label: "Total",
      value: total,
      icon: PrinterIcon,
      tint: "text-primary",
      ring: "ring-primary/20 bg-primary/8",
    },
    {
      label: "Online",
      value: online,
      icon: Wifi,
      tint: "text-[oklch(0.82_0.17_152)]",
      ring: "ring-[oklch(0.72_0.17_152/0.25)] bg-[oklch(0.72_0.17_152/0.08)]",
    },
    {
      label: "Offline",
      value: offline,
      icon: WifiOff,
      tint: "text-[oklch(0.78_0.20_25)]",
      ring: "ring-[oklch(0.62_0.22_25/0.25)] bg-[oklch(0.62_0.22_25/0.08)]",
    },
    {
      label: "Toner crítico",
      value: tonerCritical,
      icon: AlertTriangle,
      tint: "text-[oklch(0.78_0.20_25)]",
      ring: "ring-[oklch(0.62_0.22_25/0.25)] bg-[oklch(0.62_0.22_25/0.08)]",
    },
    {
      label: "U. Imagem crítica",
      value: imageCritical,
      icon: ImageIcon,
      tint: "text-[oklch(0.82_0.16_75)]",
      ring: "ring-[oklch(0.78_0.16_75/0.25)] bg-[oklch(0.78_0.16_75/0.08)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c, i) => (
        <Card
          key={c.label}
          className="group animate-slide-up overflow-hidden border-border/60 bg-card/80 transition-all duration-300 hover:border-border hover:bg-card hover:-translate-y-0.5"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-105", c.ring)}>
              <c.icon className={cn("h-4.5 w-4.5", c.tint)} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : c.value}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
