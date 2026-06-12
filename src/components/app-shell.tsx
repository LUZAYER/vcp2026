import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity, LayoutDashboard, Users, FileText, ShieldCheck, Scale,
  BarChart3, Settings, Menu, Moon, Sun, Bell, LogOut, ShieldAlert, ClipboardList,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { fmtRelative, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, markNotificationRead } from "@/lib/admin.functions";

type NavItem = { to: string; label: string; icon: typeof Activity; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/authorizations", label: "Authorizations", icon: ShieldCheck },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/appeals", label: "Appeals", icon: Scale },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/audit", label: "Audit Logs", icon: ClipboardList },
  { to: "/admin/settings", label: "Organization", icon: ShieldAlert },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:flex h-screen sticky top-0 w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <Sidebar />
      </div>
      <div className="md:pl-60">
        <TopBar />
        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const loc = useLocation();
  const NavLink = ({ item }: { item: NavItem }) => {
    const active = loc.pathname.startsWith(item.to);
    const Icon = item.icon;
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4" /> {item.label}
      </Link>
    );
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
          <Activity className="size-5" />
        </div>
        <div>
          <div className="font-semibold tracking-tight">PriorFlow AI</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Healthcare Copilot</div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">{NAV.map((i) => <NavLink key={i.to} item={i} />)}</div>
        {isAdmin && (
          <>
            <div className="mt-6 px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Administration</div>
            <div className="mt-2 space-y-1">{ADMIN_NAV.map((i) => <NavLink key={i.to} item={i} />)}</div>
          </>
        )}
      </ScrollArea>
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Link to="/settings" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">
          <Settings className="size-4" /> Settings
        </Link>
      </div>
    </div>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, roles } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 backdrop-blur px-4 md:px-6">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden"><Menu className="size-5" /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground">
          <Sidebar onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <NotificationBell />

      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
        {mounted ? (document.documentElement.classList.contains("dark") ? <Sun className="size-4" /> : <Moon className="size-4" />) : <Moon className="size-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-accent">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(user?.user_metadata?.full_name ?? user?.email ?? "?")}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium truncate">{user?.user_metadata?.full_name ?? user?.email}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="mt-1 flex gap-1 flex-wrap">{roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{ROLE_LABELS[r]}</Badge>)}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="size-4 mr-2" /> Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}><LogOut className="size-4 mr-2" /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function NotificationBell() {
  const fetchNotifs = useServerFn(getNotifications);
  const markRead = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifs({ data: undefined as never }),
    refetchInterval: 60_000,
  });
  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium text-sm">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7"
              onClick={async () => { await markRead({ data: { all: true } }); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {(data ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            <ul className="divide-y">
              {(data ?? []).map((n) => (
                <li key={n.id} className={cn("p-3 text-sm", !n.read_at && "bg-accent/30")}>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{fmtRelative(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
