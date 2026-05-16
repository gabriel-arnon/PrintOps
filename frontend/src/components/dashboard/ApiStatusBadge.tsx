import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/api";

interface ApiStatusBadgeProps {
  health: HealthStatus | undefined;
  loading?: boolean;
}

export function ApiStatusBadge({ health, loading }: ApiStatusBadgeProps) {
  const ok = health?.ok;
  const label = loading ? "Verificando" : ok ? "API Online" : "API Offline";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
        ok
          ? "border-[oklch(0.72_0.17_152/0.4)] bg-[oklch(0.72_0.17_152/0.1)] text-[oklch(0.82_0.17_152)]"
          : loading
            ? "border-border bg-muted/40 text-muted-foreground"
            : "border-[oklch(0.62_0.22_25/0.4)] bg-[oklch(0.62_0.22_25/0.1)] text-[oklch(0.78_0.20_25)]",
      )}
    >
      <span className="relative flex h-2 w-2">
        {ok && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.72_0.17_152)] opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            ok ? "bg-[oklch(0.72_0.17_152)]" : loading ? "bg-muted-foreground" : "bg-[oklch(0.62_0.22_25)]",
          )}
        />
      </span>
      <span>{label}</span>
      {ok && health && (
        <span className="hidden text-muted-foreground sm:inline">· {health.latencyMs}ms</span>
      )}
    </div>
  );
}
