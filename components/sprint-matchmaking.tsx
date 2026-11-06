"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, Radio, Zap } from "lucide-react";
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
  const [matchedWorkspaceId, setMatchedWorkspaceId] = useState<string | null>(null);
  const [revealStep, setRevealStep] = useState(0);

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
          toast.success("Builder found", { description: "Preparing your shared sprint space." });
          setMatchedWorkspaceId(data.workspaceId);
          setRevealStep(0);
          setSearching(false);
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

  useEffect(() => {
    if (!matchedWorkspaceId) return;
    if (revealStep < 2) {
      const timer = window.setTimeout(() => setRevealStep((step) => step + 1), 1050);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => router.replace(`/workspace/${matchedWorkspaceId}`),
      1400,
    );
    return () => window.clearTimeout(timer);
  }, [matchedWorkspaceId, revealStep, router]);

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <section className="relative w-full max-w-3xl text-center">
        <AnimatePresence mode="wait">
          {matchedWorkspaceId ? (
            <motion.div
              key="match-reveal"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mx-auto max-w-lg rounded-3xl border border-emerald-300/20 bg-slate-950/75 p-7 shadow-[0_24px_100px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-10"
              aria-live="polite"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.18)]">
                {revealStep < 2 ? (
                  <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Check className="size-7" />
                )}
              </span>
              <p className="mt-7 text-[10px] font-semibold tracking-[0.2em] text-emerald-200/75 uppercase">
                Match signal · confirmed
              </p>
              <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Your co-builder is in.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {[
                  "Scanning the shared sprint queue…",
                  "Aligning your collaboration workspace…",
                  "Connection established. Launching your build…",
                ][revealStep]}
              </p>
              <div className="mt-8 flex justify-center gap-2" aria-label={`Match reveal step ${revealStep + 1} of 3`}>
                {[0, 1, 2].map((step) => (
                  <span
                    key={step}
                    className={`h-1 rounded-full transition-all duration-500 ${step <= revealStep ? "w-10 bg-emerald-300" : "w-5 bg-white/10"}`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="match-search" initial={false} exit={{ opacity: 0 }}>
        <div className="mx-auto flex size-16 items-center justify-center border border-[#ccff00]/35 bg-[#ccff00]/[0.06] text-[#ccff00]">
          {searching ? <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none" /> : <Zap className="size-7" />}
        </div>
        <p className="mt-7 text-xs font-semibold tracking-[0.18em] text-[#ccff00] uppercase">Skillin / Rapid response</p>
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
          <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 text-sm text-slate-400" role="status">
            <Radio className="size-4 animate-pulse text-emerald-300 motion-reduce:animate-none" />
            <span>You’re in the queue. We’re pairing you with the first available builder.</span>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}