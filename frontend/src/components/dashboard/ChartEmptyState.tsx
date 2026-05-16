import { cn } from "@/lib/utils";

interface ChartEmptyStateProps {
  title: string;
  hint?: string;
  className?: string;
}

/**
 * Operational empty chart state — muted, no “no data” cliché copy.
 */
export function ChartEmptyState({ title, hint, className }: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-2.5 rounded-lg bg-muted/[0.07] px-6 py-10 text-center ring-1 ring-border/25",
        className,
      )}
    >
      <div
        className="h-px w-12 shrink-0 rounded-full bg-gradient-to-r from-transparent via-muted-foreground/35 to-transparent"
        aria-hidden
      />
      <p className="text-xs font-semibold tracking-tight text-muted-foreground">{title}</p>
      {hint ? (
        <p className="max-w-[18rem] text-[11px] leading-relaxed text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}
