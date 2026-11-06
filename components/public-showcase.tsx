"use client";

import { ArrowUpRight, BadgeCheck, Code2, ExternalLink, LoaderCircle, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ShowcaseData = {
  id: string;
  createdAt: string;
  quest: { id: string; title: string; brief: string; skillsUsed: string[]; completedAt: string };
  partners: Array<{ id: string; username: string; displayName: string; skills: string[]; role: string }>;
  submission: { repositoryUrl: string; demoUrl: string; writeUp: string };
  review: { rating: number; feedback: string; createdAt: string } | null;
};

export function PublicShowcase({ id }: { id: string }) {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/showcase/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "This showcase is unavailable.");
        if (active) setData(result.showcase as ShowcaseData);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "This showcase is unavailable.");
      });
    return () => { active = false; };
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <h1 className="text-2xl font-semibold text-white">Showcase unavailable</h1>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
        <LoaderCircle aria-hidden="true" className="mr-3 size-4 animate-spin text-emerald-400" />
        Loading the finished build…
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-20 -z-10 h-80 w-[min(90vw,760px)] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[100px]" />
      <header className="mb-12 flex items-center justify-between border-b border-white/10 pb-5">
        <Link href="/" className="text-sm font-bold tracking-[0.18em] text-white">SKILLIN</Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-300">
          <BadgeCheck aria-hidden="true" className="size-4" /> Verified collaboration
        </span>
      </header>

      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Quest complete</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">{data.quest.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{data.quest.brief}</p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <a href={data.submission.repositoryUrl} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-emerald-400/30">
          <span className="flex items-center gap-3"><Code2 aria-hidden="true" className="size-5 text-emerald-300" /><span><span className="block text-xs text-slate-400">Source repository</span><span className="mt-1 block font-medium text-white">Explore the build</span></span></span>
          <ArrowUpRight aria-hidden="true" className="size-4 text-slate-500 transition group-hover:text-emerald-300" />
        </a>
        <a href={data.submission.demoUrl} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-emerald-400/30">
          <span className="flex items-center gap-3"><ExternalLink aria-hidden="true" className="size-5 text-emerald-300" /><span><span className="block text-xs text-slate-400">Live demo</span><span className="mt-1 block font-medium text-white">Try the result</span></span></span>
          <ArrowUpRight aria-hidden="true" className="size-4 text-slate-500 transition group-hover:text-emerald-300" />
        </a>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">What they shipped</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">{data.submission.writeUp}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {data.quest.skillsUsed.map((skill) => (
              <span key={skill} className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-200">{skill}</span>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <h2 className="text-lg font-semibold text-white">Built together</h2>
            <div className="mt-5 space-y-4">
              {data.partners.map((partner) => (
                <div key={partner.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="font-medium text-white">{partner.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">@{partner.username} · Builder {partner.role}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {partner.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-slate-300">{skill}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {data.review && (
            <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
              <h2 className="text-lg font-semibold text-white">Partner review</h2>
              <div className="mt-3 flex gap-1 text-amber-300" aria-label={`${data.review.rating} out of 5 stars`}>
                {Array.from({ length: data.review.rating }, (_, index) => <Star aria-hidden="true" key={index} className="size-4 fill-current" />)}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">“{data.review.feedback}”</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
