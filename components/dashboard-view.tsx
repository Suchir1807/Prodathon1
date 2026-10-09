"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useIsClient, useProfile } from "@/components/profile-provider";
import { UserAvatar } from "@/components/user-avatar";
import { questChatId } from "@/lib/chats";
import { matchInsight } from "@/lib/match";
import { profileReady } from "@/lib/profile";
import { PARTNERS } from "@/lib/users";

export function DashboardView() {
  const { profile, quests, chats } = useProfile();
  const isClient = useIsClient();
  const completion = profileCompletion(profile);
  const activeQuest = quests[0];
  const suggestions = useMemo(() => {
    return [...PARTNERS]
      .map((partner) => ({ partner, insight: matchInsight(profile, partner) }))
      .sort((left, right) => right.insight.score - left.insight.score)
      .slice(0, 3);
  }, [profile]);
  const networkMatches = useMemo(() => {
    return PARTNERS.filter((partner) => {
      const insight = matchInsight(profile, partner);
      return insight.theyTeachYou.length > 0 || insight.youTeachThem.length > 0;
    }).length;
  }, [profile]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:px-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Profile completion" value={isClient ? `${completion}%` : "—"} hint={profileReady(profile) ? "Skill graph ready" : "Add skills to rank matches"} />
        <Stat label="Active quests" value={isClient ? String(quests.length) : "—"} hint="Accepted collaborations" />
        <Stat label="Network matches" value={isClient ? String(networkMatches || PARTNERS.length) : "—"} hint="Complementary partners" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="glass rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-white">Current active quest</h2>
            {activeQuest ? (
              <span className="text-[11px] text-[#ccff00]">{activeQuest.quest.timeline}</span>
            ) : null}
          </div>
          {!isClient ? (
            <p className="mt-4 text-sm text-slate-400">Loading quests…</p>
          ) : activeQuest ? (
            <div className="mt-4">
              <p className="text-lg font-medium text-white">{activeQuest.quest.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                With {activeQuest.partnerName} · {activeQuest.quest.difficulty}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                  <span>Sprint progress</span>
                  <span className="text-[#ccff00]">Day 1 of 3</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-1/3 rounded-full bg-[#ccff00]" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <TaskPeek label={activeQuest.quest.studentA.focus} task={activeQuest.quest.studentA.tasks[0]} />
                <TaskPeek label={activeQuest.quest.studentB.focus} task={activeQuest.quest.studentB.tasks[0]} />
              </div>
              {chats.some((chat) => chat.id === questChatId(activeQuest.id)) ? (
                <Link
                  href={`/messages?chat=${questChatId(activeQuest.id)}`}
                  className="mt-4 inline-flex text-xs font-medium text-[#ccff00]"
                >
                  Open quest chat
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-slate-400">No quest in progress. Propose a match to start a 3-day build.</p>
              <Link href="/find-partners" className="mt-3 inline-flex text-xs font-medium text-[#ccff00]">
                Find a partner
              </Link>
            </div>
          )}
        </article>

        <article className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Suggested partners</h2>
            <Link href="/find-partners" className="text-[11px] text-slate-400 hover:text-white">
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-white/8">
            {suggestions.map(({ partner, insight }) => (
              <li key={partner.id} className="flex items-center gap-3 py-3">
                <UserAvatar name={partner.name} className="size-8 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{partner.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{partner.role}</p>
                </div>
                <span className="text-[11px] text-[#ccff00]">{insight.score}%</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function profileCompletion(profile: { name: string; canTeach: string[]; wantsToLearn: string[]; domains: string[] }) {
  const checks = [
    profile.name.trim().length > 0,
    profile.canTeach.length > 0,
    profile.wantsToLearn.length > 0,
    profile.domains.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="glass rounded-xl px-4 py-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-medium text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </article>
  );
}

function TaskPeek({ label, task }: { label: string; task?: string }) {
  return (
    <div className="rounded-lg bg-black/25 p-3">
      <p className="text-[11px] text-[#ccff00]">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-300">{task}</p>
    </div>
  );
}
