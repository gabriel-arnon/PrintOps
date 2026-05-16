import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { RelativeTime } from "@/components/RelativeTime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { AddPrinterDialog } from "./AddPrinterDialog";
import { DeletePrinterDialog } from "./DeletePrinterDialog";
import { EditPrinterDialog } from "./EditPrinterDialog";
import { DiscoverPrintersDialog } from "./DiscoverPrintersDialog";
import { PrinterDetailsDrawer } from "./PrinterDetailsDrawer";
import { ImageUnitBar } from "./ImageUnitBar";
import { TonerBar } from "./TonerBar";
import { cn } from "@/lib/utils";
import type { Printer } from "@/lib/api";

type SortKey = "printer" | "status" | "toner_percent" | "image_unit_percent" | "last_update";
type SortDir = "asc" | "desc";
type FilterKey = "all" | "online" | "offline" | "critical";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "critical", label: "Toner crítico" },
];

export function PrintersTable({ printers, loading }: { printers: Printer[]; loading?: boolean }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("printer");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rows = useMemo(() => {
    let r = [...printers];
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (p) =>
          p.printer.toLowerCase().includes(q) ||
          p.ip.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.serial.toLowerCase().includes(q),
      );
    }
    if (filter === "online") r = r.filter((p) => p.status === "online");
    if (filter === "offline") r = r.filter((p) => p.status === "offline");
    if (filter === "critical") r = r.filter((p) => p.toner_percent < 20);

    r.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [printers, search, filter, sortKey, sortDir]);

  const selectedLastUpdate =
    selectedId != null ? printers.find((p) => p.id === selectedId)?.last_update : undefined;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  return (
    <>
      <Card className="animate-slide-up border-border/60 bg-card/80">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">Impressoras monitoradas</CardTitle>
              <p className="text-xs text-muted-foreground">
                {rows.length} de {printers.length} exibidas
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-72 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, IP, modelo, serial…"
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <DiscoverPrintersDialog />
              <AddPrinterDialog />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                className={cn(
                  "h-7 px-3 text-xs",
                  filter === f.key &&
                    f.key === "critical" &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("printer")}
                  >
                    Impressora <SortIcon k="printer" />
                  </TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="hidden md:table-cell">Modelo</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("status")}
                  >
                    Status <SortIcon k="status" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("toner_percent")}
                  >
                    Toner <SortIcon k="toner_percent" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("image_unit_percent")}
                  >
                    Unidade de Imagem <SortIcon k="image_unit_percent" />
                  </TableHead>
                  <TableHead
                    className="hidden cursor-pointer select-none lg:table-cell"
                    onClick={() => toggleSort("last_update")}
                  >
                    Última atualização <SortIcon k="last_update" />
                  </TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border/40">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
                          <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Nenhuma impressora encontrada</p>
                        <p className="text-xs text-muted-foreground">
                          {printers.length === 0
                            ? "Adicione uma impressora ou execute o escaneamento de rede."
                            : "Ajuste os filtros ou a busca para ver resultados."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => {
                    const isSelected = drawerOpen && p.id === selectedId;
                    return (
                      <TableRow
                        key={p.id ?? p.serial}
                        data-state={isSelected ? "selected" : undefined}
                        className={cn(
                          "group cursor-pointer border-border/40 transition-all duration-150 hover:bg-muted/40 hover:shadow-[inset_2px_0_0_0_var(--primary)]",
                          isSelected && "bg-primary/5 shadow-[inset_2px_0_0_0_var(--primary)]",
                        )}
                        onClick={() => {
                          if (p.id == null) return;
                          setSelectedId(p.id);
                          setDrawerOpen(true);
                        }}
                      >
                        <TableCell>
                          <div className="font-medium">{p.printer}</div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">
                            {p.serial}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">{p.ip}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {p.model}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <TonerBar percent={p.toner_percent} />
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <ImageUnitBar percent={p.image_unit_percent} />
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                          <RelativeTime date={p.last_update} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EditPrinterDialog printer={p} />
                            <DeletePrinterDialog printer={p} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <PrinterDetailsDrawer
        printerId={selectedId}
        lastUpdate={selectedLastUpdate}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
