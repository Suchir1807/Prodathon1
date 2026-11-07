"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, BookOpen, Clock3, Sparkles } from "lucide-react";

import { HelpNowButton } from "@/components/help-now";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-provider";
import { displayName } from "@/lib/profile";

type UpcomingSession = {
  id: string;
  roomId: string;
  topic: string;
  startsAt: string;
  durationMinutes: number;
  partner: { displayName: string } | null;
};

type Practice = { skill: string; recap: string; steps: string[]; date: string };

export function DashboardView() {
  const { data: session } = useSession();
  const { profile } = useProfile();
  const name = displayName(profile, session?.user?.name ?? undefined);
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [balance, setBalance] = useState(0);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/sessions", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { sessions?: UpcomingSession[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load sessions.");
        return data.sessions ?? [];
      }),
      fetch("/api/credits", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { balance?: number; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load credits.");
        return data.balance ?? 0;
      }),
      fetch("/api/help-now/practice", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { practice?: Practice | null; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load practice plan.");
        return data.practice ?? null;
      }),
    ]).then(([nextSessions, nextBalance, nextPractice]) => {
      if (!active) return;
      setSessions(nextSessions.filter((item) => item.startsAt && new Date(item.startsAt).getTime() >= Date.now()).slice(0, 3));
      setBalance(nextBalance);
      setPractice(nextPractice);
      setError("");
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Dashboard.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-200/75 uppercase">Your learning network</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">Welcome back, <span className="text-emerald-200">{name}</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Share skills, learn from peers, and get practical help when you need it.</p>
        </div>
        <div className="flex flex-wrap gap-2"><HelpNowButton className="h-10 px-4" /><Button asChild size="sm" variant="outline" className="h-10 px-4"><Link href="/find-partners">Find a partner<ArrowRight /></Link></Button></div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-emerald-200/15 bg-gradient-to-br from-emerald-300/[0.08] to-white/[0.02] p-6">
          <span className="grid size-10 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-200/[0.06] text-emerald-100"><Sparkles className="size-5" /></span>
          <h2 className="mt-4 font-heading text-xl font-semibold text-white">Help Now</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Get a focused 15- or 30-minute session for everyday questions across cooking, languages, music, fitness, academics, career, life skills, and tech.</p>
          <HelpNowButton className="mt-5" />
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <DashboardStat label="Time credits" value={loading ? "—" : `${balance} min`} detail="One credit is one minute." />
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[10px] uppercase tracking-wider text-slate-500">Skills you offer</p><div className="mt-3 flex flex-wrap gap-2">{profile.canTeach.slice(0, 4).map((skill) => <span key={skill} className="rounded-full border border-emerald-200/15 px-2.5 py-1 text-[11px] text-emerald-100">{skill}</span>)}{profile.canTeach.length === 0 ? <Link href="/profile" className="text-xs text-slate-400 hover:text-white">Add your skills in Profile</Link> : null}</div></div>
        </section>
      </div>

      {error ? <p role="alert" className="mt-5 rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white"><Clock3 className="size-4 text-emerald-200" />Upcoming sessions</h2><Link href="/sessions" className="text-xs text-emerald-200 hover:text-white">All Sessions</Link></div>
          {loading ? <p className="mt-5 text-sm text-slate-500">Loading sessions…</p> : sessions.length ? <div className="mt-4 space-y-3">{sessions.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-xl border border-white/8 p-3"><UserAvatar name={item.partner?.displayName ?? "Learning partner"} className="size-9 text-[10px]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{item.topic}</p><p className="mt-1 truncate text-xs text-slate-500">{item.partner?.displayName ?? "Learning partner"} · {new Date(item.startsAt).toLocaleString()}</p></div><Link href={`/session-room/${item.roomId}`} aria-label={`Open ${item.topic} session room`} className="text-emerald-200 hover:text-white"><ArrowRight className="size-4" /></Link></article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">No upcoming Sessions. Start with Help Now or schedule a session with a partner.</p>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white"><BookOpen className="size-4 text-sky-200" />Today&apos;s practice</h2>
          {practice ? <><p className="mt-3 text-sm font-medium text-emerald-100">{practice.skill}</p><p className="mt-2 text-sm leading-6 text-slate-300">{practice.recap}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-400">{practice.steps.map((step) => <li key={step}>{step}</li>)}</ol></> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Finish a Help Now session to get a recap and three small practice steps here.</p>}
        </section>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/sessions" title="Sessions" description="Review upcoming, requested, and past sessions." />
        <QuickLink href="/asks" title="Asks" description="Offer a skill or request a learning partner." />
        <QuickLink href="/messages" title="Messages" description="Continue conversations with your peers." />
      </section>
    </div>
  );
}

function DashboardStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link href={href} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-emerald-200/20 hover:bg-white/[0.04]"><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></Link>;
}
