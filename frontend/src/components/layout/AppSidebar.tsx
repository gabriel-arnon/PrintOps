import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Printer,
  BarChart3,
  Bell,
  Settings,
  Activity,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  alertCount?: number;
}

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, enabled: true },
  { title: "Impressoras", url: "/printers", icon: Printer, enabled: false },
  { title: "Relatórios", url: "/reports", icon: BarChart3, enabled: false },
] as const;

const systemItems = [
  { title: "Alertas", url: "/alerts", icon: Bell, enabled: false, badgeKey: "alerts" },
  { title: "Configurações", url: "/settings", icon: Settings, enabled: false },
] as const;

export function AppSidebar({ alertCount = 0 }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center px-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">PrintOps</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Monitoring Suite
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={item.enabled}
                      isActive={active}
                      tooltip={item.title}
                      className={cn(!item.enabled && "cursor-not-allowed opacity-50")}
                    >
                      {item.enabled ? (
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const isConfig = item.url === "/settings";
                const isAlerts = item.url === "/alerts";
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    {isConfig && item.enabled ? (
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(!item.enabled && "cursor-not-allowed opacity-60")}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    ) : isAlerts && item.enabled ? (
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(!item.enabled && "cursor-not-allowed opacity-60")}
                      >
                        <Link to={item.url} className="flex items-center gap-2 relative">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                          {"badgeKey" in item && alertCount > 0 && !collapsed && (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground tabular-nums">
                              {alertCount}
                            </span>
                          )}
                          {"badgeKey" in item && alertCount > 0 && collapsed && (
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        className={cn(!item.enabled && "cursor-not-allowed opacity-60")}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {"badgeKey" in item && alertCount > 0 && !collapsed && (
                          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground tabular-nums">
                            {alertCount}
                          </span>
                        )}
                        {"badgeKey" in item && alertCount > 0 && collapsed && (
                          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                        )}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
