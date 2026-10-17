"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  ArrowRight,
  Crosshair,
  Radio,
  Terminal,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BeaconCenter } from "@/components/beacon-center";
import { DashboardSkeleton } from "@/components/ui/loading-skeletons";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { formatUsername, profileReady } from "@/lib/profile";
import { cn } from "@/lib/utils";

const MOCK_EVENTS = [
  "A founder matched for a Next.js / Python sprint",
  "New beacon deployed in the local radius",
  "A skill trade was completed in Product Design",
  "Two builders started a 12-hour flash build",
  "A new React specialist joined the network",
];

const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function DashboardView() {
  const { profile, quests } = useProfile();
  const { data: session } = useSession();
  const isClient = useIsClient();
  const [clock, setClock] = useState<Date | null>(null);
  const [activityIndex, setActivityIndex] = useState(0);
  const completion = profileCompletion(profile);
  const activeQuest = quests[0];
  const greetingName = profile.name.trim() || formatUsername(session?.user?.name ?? "Builder");

  useEffect(() => {
    const updateClock = () => setClock(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => setActivityIndex((current) => (current + 1) % MOCK_EVENTS.length),
      4500,
    );
    return () => window.clearInterval(interval);
  }, []);

  if (!isClient) return <DashboardSkeleton />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#07111a] px-5 py-5 shadow-[0_0_36px_rgba(16,185,129,0.06)] sm:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.11),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-emerald-300/70 uppercase">
              Founder command center
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                {greetingName}
              </span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">Your network is ready when you are.</p>
          </div>
          <div className="flex items-center gap-3">
            {clock ? (
              <time className="hidden font-mono text-xs tabular-nums text-slate-400 sm:block">
                {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              </span>
              System online
            </span>
          </div>
        </div>
      </section>

      <BeaconCenter />

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Workspace metrics">
        <article className="flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-[11px] tracking-wide text-slate-400 uppercase">Profile completion</p>
            <p className="mt-2 text-sm font-medium text-white">Your signal strength</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {profileReady(profile) ? "Skill graph ready" : "Add skills on your profile"}
            </p>
          </div>
          <div className="relative grid size-20 shrink-0 place-items-center">
            <svg viewBox="0 0 100 100" className="size-20 -rotate-90" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="7"
              />
              <motion.circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - completion / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 0 7px rgba(34,211,238,0.7))" }}
              />
            </svg>
            <span className="absolute text-sm font-semibold text-white">{completion}%</span>
          </div>
        </article>

        <article className="relative isolate flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(16,185,129,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.16)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute -right-6 -bottom-12 -z-10 size-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div>
            <p className="text-[11px] tracking-wide text-slate-400 uppercase">Active quests</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{quests.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">Accepted collaborations</p>
          </div>
          <div className="grid size-14 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
            <Crosshair className="size-7" />
          </div>
        </article>
      </section>

      {activeQuest ? (
        <section className="relative overflow-hidden rounded-xl border border-emerald-400/15 bg-black/40 p-6 backdrop-blur-md">
          <div className="pointer-events-none absolute -right-6 -top-7 text-emerald-400/[0.06]">
            <Zap className="size-40" />
          </div>
          <div className="relative">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-300/70 uppercase">
              Mission in progress
            </p>
            <h2 className="mt-2 text-sm font-medium text-white">Current quest</h2>
            <p className="mt-2 text-lg font-semibold text-white">{activeQuest.quest.title}</p>
            <p className="mt-1 text-xs text-slate-400">Collaborating with {activeQuest.partnerName}</p>
            <Link
              href="/workspace"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
            >
              Open workspace <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="group relative isolate overflow-hidden rounded-2xl border-2 border-dashed border-neutral-700 bg-[#090f18]/80 px-5 py-10 text-center transition-colors hover:border-emerald-500/50 sm:py-12">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_65%)] opacity-70 transition-opacity group-hover:opacity-100" />
          <Terminal className="pointer-events-none absolute -right-3 -bottom-8 -z-10 size-48 rotate-6 text-emerald-300/[0.035]" />
          <div className="mx-auto grid size-12 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
            <Zap className="size-5" />
          </div>
          <p className="mt-4 text-lg font-semibold text-white">Your next build starts here.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Find a collaborator, trade skills, and turn a good idea into a shipped project.
          </p>
          <Link
            href="/find-partners"
            className="group/cta mt-6 inline-flex items-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#06110d] shadow-[0_0_22px_rgba(16,185,129,0.22)] transition hover:scale-[1.03] hover:bg-emerald-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          >
            Find a partner
            <motion.span
              aria-hidden="true"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="size-4" />
            </motion.span>
          </Link>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-cyan-400/15 bg-[#070d16]/90" aria-label="Simulated global activity">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-cyan-300" />
            <h2 className="text-xs font-semibold tracking-wide text-white uppercase">Global feed</h2>
            <span className="rounded border border-cyan-400/20 bg-cyan-400/[0.06] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-cyan-300 uppercase">
              Simulated
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
            <Activity className="size-3" /> Live Comm-Link
          </span>
        </header>
        <div className="min-h-16 px-4 py-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={activityIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-2"
            >
              {Array.from({ length: 3 }, (_, offset) => {
                const eventIndex = (activityIndex + offset) % MOCK_EVENTS.length;
                return (
                  <li key={`${activityIndex}-${eventIndex}`} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      offset === 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600",
                    )} />
                    <span className={offset === 0 ? "text-slate-200" : "text-slate-500"}>
                      {MOCK_EVENTS[eventIndex]}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-600">
                      {offset === 0 ? "NOW" : `${offset * 2}m`}
                    </span>
                  </li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function profileCompletion(profile: {
  name: string;
  canTeach: string[];
  wantsToLearn: string[];
  domains: string[];
}) {
  const checks = [
    profile.name.trim().length > 0,
    profile.canTeach.length > 0,
    profile.wantsToLearn.length > 0,
    profile.domains.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
