import { LogOut, RefreshCw } from "lucide-react";

import { RelativeTime } from "@/components/RelativeTime";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ApiStatusBadge } from "@/components/dashboard/ApiStatusBadge";
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
}

export function Topbar({
  title,
  subtitle,
  health,
  healthLoading,
  lastUpdated,
  onRefresh,
  refreshing,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
        <span className="tabular-nums">
          Última sincronização: <RelativeTime date={lastUpdated} live />
        </span>
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
    </header>
  );
}
