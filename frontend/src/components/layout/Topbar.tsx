import { LogOut, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { ApiStatusBadge } from "@/components/dashboard/ApiStatusBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { HealthStatus } from "@/lib/api";
import { logout } from "@/lib/auth";

interface TopbarProps {
  title: string;
  subtitle?: string;
  health: HealthStatus | undefined;
  healthLoading: boolean;
  lastUpdated?: number;
  onRefresh: () => void;
  refreshing: boolean;
  telemetry?: ReactNode;
}

export function Topbar({
  title,
  subtitle,
  health,
  healthLoading,
  lastUpdated,
  onRefresh,
  refreshing,
  telemetry,
}: TopbarProps) {
  const fallbackSync = (
    <span className="text-xs tabular-nums text-muted-foreground">
      Ultima sincronizacao: <RelativeTime date={lastUpdated} live />
    </span>
  );

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6" />

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center lg:flex">
        {telemetry ?? fallbackSync}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 md:flex lg:hidden">
          {telemetry ?? fallbackSync}
        </div>

        <ApiStatusBadge health={health} loading={healthLoading} />

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-8 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          title="Sair"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
