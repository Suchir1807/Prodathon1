"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Hexagon,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Handshake,
  BookOpen,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  Clock3,
  Users,
  X,
} from "lucide-react";

import { InvitationsInbox } from "@/components/invitations-inbox";
import { GlobalUserSearch } from "@/components/global-user-search";
import { NotificationBell } from "@/components/notification-bell";
import { UserAvatar } from "@/components/user-avatar";
import { CommandPalette } from "@/components/command-palette";
import { useProfile } from "@/components/profile-provider";
import { unreadTotal } from "@/lib/chats";
import { displayName } from "@/lib/profile";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exchanges", label: "Exchanges", icon: Handshake },
  { href: "/sessions", label: "Sessions", icon: Clock3 },
  { href: "/asks", label: "Asks", icon: CircleHelp },
  { href: "/find-partners", label: "Find Partners", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/profile", label: "Skill Passport", icon: BookOpen },
  { href: "/info", label: "Info", icon: Info },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/exchanges": "Exchanges",
  "/sessions": "Sessions",
  "/asks": "Asks",
  "/find-partners": "Find Partners",
  "/messages": "Messages",
  "/info": "How it Works",
  "/profile": "Skill Passport",
};

const AUTH_ROUTES = new Set(["/login", "/signup", "/logout", "/onboarding"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [collapsePreferenceLoaded, setCollapsePreferenceLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const preference = window.localStorage.getItem("skillin:sidebar-collapsed");
        setIsCollapsed(preference === null ? window.innerWidth < 1440 : preference === "true");
      } catch {
        setIsCollapsed(window.innerWidth < 1440);
      }
      setCollapsePreferenceLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!collapsePreferenceLoaded) return;
    try {
      window.localStorage.setItem("skillin:sidebar-collapsed", String(isCollapsed));
    } catch {
      // Sidebar preference remains usable without local storage.
    }
  }, [collapsePreferenceLoaded, isCollapsed]);

  if (AUTH_ROUTES.has(pathname) || pathname === "/") {
    return <>{children}</>;
  }

  const title =
    TITLES[pathname] ?? (    pathname.startsWith("/session-room/") ? "Session Room" : "Skillin");

  return (
    <div className="min-h-dvh">
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-medium text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <AppSidebar
        open={open}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onNavigate={() => setOpen(false)}
      />
      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "md:pl-16" : "md:pl-60",
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-black/70 px-4 backdrop-blur-2xl md:px-6">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-300 md:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <p className="min-w-0 flex-1 truncate text-sm text-white sm:flex-none">
            <span className="hidden text-slate-400 sm:inline">
              Skillin<span className="px-2 text-slate-600">/</span>
            </span>
            {title}
          </p>
          <div className="hidden sm:block">
            <GlobalUserSearch />
          </div>
          <CommandPalette />
          <NotificationBell />
          <InvitationsInbox />
        </header>
        <main id="main-content" key={pathname} tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

function AppSidebar({
  open,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}: {
  open: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { profile, chats } = useProfile();
  const name = displayName(profile, session?.user?.name ?? undefined);
  const unread = unreadTotal(chats);

  return (
    <aside
      id="primary-navigation"
      aria-label="Primary navigation"
      className={cn(
        "group/sidebar glass fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-hidden border-r border-white/8 transition-all duration-300 md:translate-x-0",
        isCollapsed && "md:w-16 md:hover:w-60",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-white/8 px-4",
          isCollapsed && "md:h-auto md:flex-col md:px-2 md:py-3 md:group-hover/sidebar:h-14 md:group-hover/sidebar:flex-row md:group-hover/sidebar:px-4 md:group-hover/sidebar:py-0",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn("flex min-w-0 flex-1 items-center gap-2", isCollapsed && "md:flex-none md:group-hover/sidebar:flex-1")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-300">
            <Hexagon className="size-4" />
          </span>
          <span className={cn("truncate text-sm font-semibold tracking-tight text-white", isCollapsed && "md:hidden md:group-hover/sidebar:block")}>
            Skillin
          </span>
        </Link>
        <button
          type="button"
          className={cn("hidden size-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-all duration-300 hover:bg-white/5 hover:text-white md:inline-flex", isCollapsed && "md:group-hover/sidebar:ml-auto")}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          aria-controls="primary-navigation"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 md:hidden"
          aria-label="Close navigation"
          onClick={onNavigate}
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className={cn("flex flex-1 flex-col gap-1 p-3", isCollapsed && "md:px-2 md:group-hover/sidebar:px-3")}>
        {LINKS.map((link) => {
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              title={link.label}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                isCollapsed && "md:justify-center md:px-0 md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-3",
                active
                  ? "border-white/25 bg-white/[0.05] text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-white",
              )}
            >
              <span className="relative">
                <Icon className="size-4" />
                {link.href === "/messages" && unread > 0 && isCollapsed ? (
                  <span className="absolute -top-1 -right-1 hidden size-1.5 rounded-full bg-emerald-300 md:block" />
                ) : null}
              </span>
              <span className={cn("flex-1 truncate", isCollapsed && "md:hidden md:group-hover/sidebar:block")}>{link.label}</span>
              {link.href === "/messages" && unread > 0 ? (
                <span className={cn("text-[11px] font-medium text-zinc-300", isCollapsed && "md:hidden md:group-hover/sidebar:block")}>
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-white/8 p-3", isCollapsed && "md:px-2 md:group-hover/sidebar:px-3")}>
        <Link
          href="/profile"
          title="View profile"
          aria-label="View profile"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-2 text-left transition hover:bg-white/5",
            isCollapsed && "md:justify-center md:px-0 md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-2",
            pathname === "/profile" && "border-white/15 bg-white/[0.04]",
          )}
        >
          <UserAvatar name={name} className="size-8 text-[10px]" />
          <span className={cn("min-w-0 flex-1", isCollapsed && "md:hidden md:group-hover/sidebar:block")}>
            <span className="block truncate text-sm text-white">{name}</span>
            <span className="block text-[11px] text-slate-500">View profile</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
