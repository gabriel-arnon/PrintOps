import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deletePrinter, type Printer } from "@/lib/api";

export function DeletePrinterDialog({ printer }: { printer: Printer }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deletePrinter(printer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Impressora removida", {
        description: `${printer.printer} foi excluída da frota.`,
      });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Falha ao remover impressora", {
        description: err.message,
      });
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (mutation.isPending) return;
        setOpen(o);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remover ${printer.printer}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border/60 bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover impressora</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente remover esta impressora?
            <span className="mt-3 block rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">{printer.printer}</span>
              <span className="ml-2 font-mono text-muted-foreground">{printer.ip}</span>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remover
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
