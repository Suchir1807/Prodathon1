"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Radio, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type MatchResponse = {
  matched?: boolean;
  status?: "searching";
  workspaceId?: string;
  error?: string;
};

export function SprintMatchmaking() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    let requestInFlight = false;

    async function checkForMatch() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch("/api/sprint/match", { method: "POST" });
        const data = (await response.json()) as MatchResponse;
        if (!response.ok) throw new Error(data.error ?? "Matchmaking failed.");
        if (data.matched && data.workspaceId) {
          toast.success("Builder found", { description: "Opening your sprint workspace." });
          setSearching(false);
          router.replace(`/workspace/${data.workspaceId}`);
          return;
        }
      } catch (matchError) {
        if (!cancelled) {
          const message = matchError instanceof Error ? matchError.message : "Matchmaking failed.";
          setError(message);
          toast.error("Matchmaking interrupted", { description: message });
          setSearching(false);
        }
      } finally {
        requestInFlight = false;
      }
    }

    void checkForMatch();
    const interval = window.setInterval(() => void checkForMatch(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router, searching]);

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <section className="relative w-full max-w-3xl text-center">
        <div className="mx-auto flex size-16 items-center justify-center border border-[#ccff00]/35 bg-[#ccff00]/[0.06] text-[#ccff00]">
          {searching ? <LoaderCircle className="size-7 animate-spin" /> : <Zap className="size-7" />}
        </div>
        <p className="mt-7 text-xs font-semibold tracking-[0.18em] text-[#ccff00] uppercase">CoFoundry / Rapid response</p>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-6xl">12-Hour Flash Build</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          Pair with one builder. Pick a sharp problem. Ship a working proof before the clock runs out.
        </p>
        <div className="mt-10 border-y border-white/10 py-7">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Build window</p>
          <p className="mt-2 font-mono text-5xl font-medium tabular-nums text-white sm:text-7xl">12<span className="text-[#ccff00]">:</span>00<span className="text-[#ccff00]">:</span>00</p>
        </div>
        <Button
          size="lg"
          disabled={searching}
          loading={searching}
          onClick={() => {
            setError("");
            setSearching(true);
            toast.info("Matchmaking started", { description: "Searching for your collaboration partner." });
          }}
          className="mt-8 h-14 min-w-64 border-[#ccff00]/70 bg-[#ccff00] px-8 text-base font-semibold text-slate-950 hover:bg-[#d9ff43] hover:text-slate-950"
        >
          {!searching ? <Zap /> : <Radio className="animate-pulse" />}
          {searching ? "Finding your builder…" : "Enter Matchmaking"}
        </Button>
        {searching ? (
          <p className="mt-4 text-sm text-slate-400">You’re in the queue. We’re pairing you with the first available builder.</p>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      </section>
    </div>
  );
}