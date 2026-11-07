"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Command,
  Compass,
  CircleHelp,
  LayoutDashboard,
  MessageSquare,
  Search,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const COMMANDS = [
  { action: "help-now", label: "Help Now", detail: "Get an on-demand skill micro-session", icon: CircleHelp },
  { href: "/dashboard", label: "Dashboard", detail: "Your learning network", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", detail: "View your learning overview or edit your skills", icon: Compass },
  { href: "/find-partners", label: "Find partners", detail: "Match by complementary skills", icon: UsersRound },
  { href: "/asks", label: "Asks", detail: "Find or publish a skill Ask", icon: CircleHelp },
  { href: "/sessions", label: "Sessions", detail: "Book time and earn credits", icon: Clock3 },
  { href: "/messages", label: "Messages", detail: "Catch up with your people", icon: MessageSquare },
  { href: "/info", label: "How it works", detail: "Explore the Skillin loop", icon: ArrowRight },
] as const;

export function CommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return COMMANDS.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 gap-2 px-2.5 text-slate-400"
      >
        <Search className="size-3.5" />
        <span className="hidden lg:inline">Quick jump</span>
        <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-500 sm:inline">
          <Command className="mr-0.5 inline size-2.5" />
          K
        </kbd>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden border-white/10 bg-[#0b1710]/95 p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Quick navigation</DialogTitle>
            <DialogDescription>Search Skillin pages and jump to a destination.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
            <Search aria-hidden="true" className="size-4 shrink-0 text-emerald-200/70" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Where do you want to go?"
              aria-label="Search navigation commands"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <kbd className="shrink-0 rounded border border-white/10 px-1.5 py-1 font-mono text-[9px] text-slate-500">ESC</kbd>
          </div>
          <nav className="max-h-[min(60vh,420px)] overflow-y-auto p-2" aria-label="Navigation destinations">
            {filteredCommands.length ? filteredCommands.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href ?? item.action}
                  type="button"
                  aria-current={item.href && pathname === item.href ? "page" : undefined}
                  onClick={() => {
                    setOpen(false);
                    if ("action" in item) window.dispatchEvent(new Event("skillin:help-now"));
                    else if (item.href) router.push(item.href);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-slate-400 transition-colors group-hover:border-emerald-200/20 group-hover:bg-emerald-200/[0.07] group-hover:text-emerald-100">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span>
                  </span>
                  <ArrowRight className="size-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" aria-hidden="true" />
                </button>
              );
            }) : (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No destination matches “{query}”.
              </p>
            )}
          </nav>
          <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 text-[10px] text-slate-500">
            <span>Move around Skillin</span>
            <span>Press <kbd className="rounded border border-white/10 px-1">Esc</kbd> to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
