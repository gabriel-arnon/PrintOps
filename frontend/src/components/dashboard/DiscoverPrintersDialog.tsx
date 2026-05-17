import { useEffect, useState } from "react";
import { Loader2, Radar, Plus, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  createPrinter,
  discoverPrinters,
  type DiscoveredPrinter,
} from "@/lib/api";

export function DiscoverPrintersDialog() {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<DiscoveredPrinter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingIp, setAddingIp] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState("Iniciando varredura SNMP...");
  const qc = useQueryClient();

  useEffect(() => {
    if (!scanning) return;
    const messages = [
      "Iniciando varredura SNMP...",
      "Escaneando rede local...",
      "Consultando dispositivos...",
      "Coletando informações dos hosts...",
      "Quase pronto...",
    ];
    let i = 0;
    setScanMessage(messages[0]);
    const id = setInterval(() => {
      i = Math.min(i + 1, messages.length - 1);
      setScanMessage(messages[i]);
    }, 4000);
    return () => clearInterval(id);
  }, [scanning]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setResults(null);
    try {
      const data = await discoverPrinters();
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao escanear a rede");
    } finally {
      setScanning(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: (p: DiscoveredPrinter) =>
      createPrinter({ name: p.model, ip: p.ip }),
    onMutate: (p) => setAddingIp(p.ip),
    onSuccess: (_d, p) => {
      toast.success("Impressora adicionada");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setResults((prev) =>
        prev
          ? prev.map((it) =>
              it.ip === p.ip ? { ...it, already_added: true } : it,
            )
          : prev,
      );
    },
    onError: (err: Error) => {
      toast.error("Falha ao adicionar impressora", { description: err.message });
    },
    onSettled: () => setAddingIp(null),
  });

  const handleOpenChange = (o: boolean) => {
    if (scanning) return;
    setOpen(o);
    if (!o) {
      setResults(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-1.5">
          <Radar className="h-4 w-4" />
          Escanear Rede
        </Button>
      </DialogTrigger>
      <DialogContent className=" border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-5xl " >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-primary" />
            Descoberta de impressoras
          </DialogTitle>
          <DialogDescription>
            Procure impressoras disponíveis na rede via SNMP e adicione ao
            monitoramento com um clique.
          </DialogDescription>
        </DialogHeader>

        {scanning ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
              <div className="relative">
                <Radar className="h-5 w-5 text-primary animate-pulse" />
                <span className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{scanMessage}</p>
                <p className="text-xs text-muted-foreground">
                  Sondando dispositivos via SNMP — isso pode levar até 1 minuto.
                </p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={runScan}>
              Tentar novamente
            </Button>
          </div>
        ) : results ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {results.length} impressora{results.length === 1 ? "" : "s"}{" "}
                encontrada{results.length === 1 ? "" : "s"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={runScan}
                className="h-8 gap-1.5"
              >
                <Radar className="h-3.5 w-3.5" />
                Escanear novamente
              </Button>
            </div>
            <div className=" max-h-[420px] overflow-auto rounded-md border border-border/60 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent " >
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">Modelo</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500"> IP </TableHead>
                    <TableHead className="hidden md:table-cell text-[11px] uppercase tracking-wider text-zinc-500">Serial</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">Status</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-500">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
                            <Radar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">Nenhuma impressora encontrada</p>
                          <p className="text-xs text-muted-foreground">
                            Verifique se os dispositivos estão na mesma rede e com SNMP habilitado.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((p) => (
                      <TableRow
                        key={p.ip}
                        className="h14 border-border/40 transition-all duration-200 hover:bg-cyan-500/5 hover:border-cyan-500/20 "
                      >
                        <TableCell className="font-medium">{p.model}</TableCell>
                        <TableCell className=" font-mono text-sm tabular-nums text-zinc-100 ">
                          {p.ip}
                        </TableCell>
                        <TableCell className="hidden font-mono text-[10px] uppercase text-zinc-500 md:table-cell">
                          {p.serial}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                              p.already_added
                                ? "border-primary/40 bg-primary/10 text-primary "
                                : "border-[oklch(0.72_0.17_152/0.4)] bg-[oklch(0.72_0.17_152/0.12)] text-[oklch(0.82_0.17_152)]",
                            )}
                          >
                            {p.already_added ? (
                              <>
                                <Check className="h-3 w-3 " /> Monitorada
                              </>
                            ) : (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.17_152)]" />
                                Nova
                              </>
                            )}
                          </span>
                          <span className="ml-2 hidden">
                            <StatusBadge status={p.status} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            variant={p.already_added ?   "secondary" : "default"}
                            disabled={
                              p.already_added || addingIp === p.ip
                            }
                            onClick={() => addMutation.mutate(p)}
                            className={cn( "h-8 gap-1.5", p.already_added && "opacity-70" )}
                          >
                            {addingIp === p.ip ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Adicionando…
                              </>
                            ) : p.already_added ? (
                              "Adicionada"
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                Adicionar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12">
            <Button onClick={runScan} className="gap-1.5">
              <Radar className="h-4 w-4" />
              Iniciar escaneamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
