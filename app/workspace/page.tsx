"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Check, Code2, Sparkles, Users } from "lucide-react";

import { QuestWorkspace } from "@/components/quest-workspace";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceServerSnapshot,
  getWorkspaceSnapshot,
  readActiveWorkspace,
  subscribeWorkspace,
} from "@/lib/workspace";

export default function WorkspacePage() {
  const snapshot = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getWorkspaceServerSnapshot,
  );
  const isMatched = Boolean(snapshot && readActiveWorkspace());

  if (!isMatched) {
    return (
      <main className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden bg-[#07110c] px-4 py-14 text-white sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[38%] size-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.08] blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>
        <div className="w-full max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.12)]">
              <Users className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-7 text-[10px] font-semibold tracking-[0.2em] text-emerald-200/75 uppercase">
              The build room
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Your next build starts with a good match.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Find a collaborator whose skills complement yours, then turn one shared idea into something you can show off.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="h-11 px-5">
                <Link href="/find-partners">
                  Find a collaborator
                  <ArrowRight />
                </Link>
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-slate-300">
                <Sparkles className="size-3.5 text-signal" aria-hidden="true" />
                A focused 3-day quest
              </div>
            </div>
          </div>

          <section aria-label="How a Skillin quest works" className="mt-12 rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:mt-16 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">From first hello to shipped work</p>
                <h2 className="mt-1 text-sm font-medium text-slate-200">A small sprint. A real thing to share.</h2>
              </div>
              <Code2 className="size-5 shrink-0 text-emerald-300/70" aria-hidden="true" />
            </div>
            <ol className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Match", detail: "Meet a complementary maker", icon: Users },
                { label: "Quest", detail: "Choose a tight project brief", icon: Sparkles },
                { label: "Build", detail: "Learn by making together", icon: Code2 },
                { label: "Showcase", detail: "Share what you shipped", icon: Check },
              ].map(({ label, detail, icon: Icon }, index) => (
                <li key={label} className="relative rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className={`grid size-7 place-items-center rounded-lg ${index === 0 ? "bg-emerald-300/10 text-emerald-200" : "bg-white/[0.05] text-slate-400"}`}>
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    {label}
                  </span>
                  <p className="mt-2 pl-9 text-[11px] leading-4 text-slate-500">{detail}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    );
  }

  return <QuestWorkspace />;
}
