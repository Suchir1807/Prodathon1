"use client";

import { useEffect, useRef } from "react";
import { Hexagon, Loader2 } from "lucide-react";

import { logoutUser } from "@/lib/client-logout";

export default function LogoutPage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void logoutUser();
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(204,255,0,0.12),transparent)]"
      />
      <div className="glass relative flex flex-col items-center rounded-2xl border border-white/10 px-10 py-12 text-center shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <span className="mb-6 flex size-14 items-center justify-center rounded-xl border border-[#ccff00]/35 bg-[#ccff00]/5 text-[#ccff00]">
          <Hexagon className="size-7" />
        </span>
        <Loader2 className="size-8 animate-spin text-[#ccff00]" aria-hidden />
        <p className="mt-6 text-lg font-medium text-white">
          Signing out of Mission Control…
        </p>
        <p className="mt-2 max-w-xs text-sm text-slate-400">
          Clearing your session and returning to the login gate.
        </p>
      </div>
    </div>
  );
}
