import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Shield, LayoutDashboard, History,
  Bell, Search, ChevronRight, type LucideIcon,
} from "lucide-react";

type NavItem = { icon: LucideIcon; label: string; to?: string };

const NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Live console", to: "/app" },
  { icon: History, label: "Recent calls", to: "/calls" },
];

/**
 * Shared chrome for the operator console pages (sidebar + topbar). Pages render
 * their content as children; the sidebar nav links between console pages and
 * highlights the active one.
 */
export function ConsoleShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (l) => l.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/5 bg-white/[0.015]">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-white/5">
          <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center shadow-glow">
            <Shield className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm">CallGuard</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Console</div>
          </div>
        </Link>
        <nav className="p-3 space-y-1 text-sm">
          {NAV.map((i) => {
            const active = !!i.to && pathname === i.to;
            const className = `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              active
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
            }`;
            return i.to ? (
              <Link key={i.label} to={i.to} className={className}>
                <i.icon className="size-4" /> {i.label}
              </Link>
            ) : (
              <button key={i.label} className={`${className} cursor-default`} title="Coming soon">
                <i.icon className="size-4" /> {i.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-4">
          <div className="glass rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="size-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="font-medium">All systems normal</span>
            </div>
            <div className="text-muted-foreground">SOC 2 · GDPR · ISO 27001</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{title}</span>
            {subtitle && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground">{subtitle}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm text-muted-foreground w-64">
              <Search className="size-3.5" />
              <input
                placeholder="Search calls, agents, threats..."
                className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <button className="size-9 glass rounded-full grid place-items-center">
              <Bell className="size-4" />
            </button>
            <div className="size-9 rounded-full bg-gradient-brand grid place-items-center text-xs font-semibold text-primary-foreground">
              AL
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
