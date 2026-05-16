import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePrinter, type Printer } from "@/lib/api";

export function EditPrinterDialog({ printer }: { printer: Printer }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(printer.printer);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setName(printer.printer);
  }, [open, printer.printer]);

  const mutation = useMutation({
    mutationFn: () => updatePrinter(printer.id, { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Impressora atualizada");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Falha ao atualizar impressora", { description: err.message });
    },
  });

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== printer.printer && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (mutation.isPending) return;
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label={`Editar ${printer.printer}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/60 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar impressora</DialogTitle>
          <DialogDescription>
            Altere o nome amigável exibido no dashboard.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="printer-name">Nome amigável</Label>
            <Input
              id="printer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Enfermaria"
              autoFocus
              disabled={mutation.isPending}
            />
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              {printer.ip} · {printer.serial}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
