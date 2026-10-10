"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Hexagon,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Users,
  X,
} from "lucide-react";

import { InvitationsInbox } from "@/components/invitations-inbox";
import { UserAvatar } from "@/components/user-avatar";
import { useProfile } from "@/components/profile-provider";
import { unreadTotal } from "@/lib/chats";
import { displayName } from "@/lib/profile";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Workspace", icon: Radar },
  { href: "/find-partners", label: "Find Partners", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/workspace": "Quest Workspace",
  "/find-partners": "Find Partners",
  "/messages": "Messages",
  "/profile": "Profile",
};

const AUTH_ROUTES = new Set(["/login", "/signup", "/logout", "/onboarding"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (AUTH_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  const title = TITLES[pathname] ?? "CoFoundry";

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
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/8 bg-[#0a0f1c]/75 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-300 md:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <p className="min-w-0 flex-1 truncate text-sm text-slate-400">
            CoFoundry
            <span className="px-2 text-slate-600">/</span>
            <span className="text-white">{title}</span>
          </p>
          <InvitationsInbox />
        </header>
        <main key={pathname}>{children}</main>
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
      className={cn(
        "glass fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-hidden border-r border-white/8 transition-all duration-300 md:translate-x-0",
        isCollapsed && "md:w-16",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-white/8 px-4",
          isCollapsed && "md:h-auto md:flex-col md:px-2 md:py-3",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn("flex min-w-0 flex-1 items-center gap-2", isCollapsed && "md:flex-none")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#ccff00]/30 text-[#ccff00]">
            <Hexagon className="size-4" />
          </span>
          <span className={cn("truncate text-sm font-semibold tracking-tight text-white", isCollapsed && "md:hidden")}>
            CoFoundry
          </span>
        </Link>
        <button
          type="button"
          className="hidden size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-[#ccff00] md:inline-flex"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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

      <nav className={cn("flex flex-1 flex-col gap-1 p-3", isCollapsed && "md:px-2")}>
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
              title={link.label}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                isCollapsed && "md:justify-center md:px-0",
                active
                  ? "border-[#ccff00] bg-slate-800/80 text-[#ccff00]"
                  : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="relative">
                <Icon className="size-4" />
                {link.href === "/messages" && unread > 0 && isCollapsed ? (
                  <span className="absolute -top-1 -right-1 hidden size-1.5 rounded-full bg-[#ccff00] md:block" />
                ) : null}
              </span>
              <span className={cn("flex-1 truncate", isCollapsed && "md:hidden")}>{link.label}</span>
              {link.href === "/messages" && unread > 0 ? (
                <span className={cn("text-[11px] font-medium text-[#ccff00]", isCollapsed && "md:hidden")}>
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-white/8 p-3", isCollapsed && "md:px-2")}>
        <Link
          href="/profile"
          title="View profile"
          aria-label="View profile"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-2 text-left transition hover:bg-white/5",
            isCollapsed && "md:justify-center md:px-0",
            pathname === "/profile" && "border-[#ccff00]/30 bg-slate-800/50",
          )}
        >
          <UserAvatar name={name} className="size-8 text-[10px]" />
          <span className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
            <span className="block truncate text-sm text-white">{name}</span>
            <span className="block text-[11px] text-slate-500">View profile</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
