"use client";

import Link from "next/link";

import { BeaconCenter } from "@/components/beacon-center";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { profileReady } from "@/lib/profile";

export function DashboardView() {
  const { profile, quests } = useProfile();
  const isClient = useIsClient();
  const completion = profileCompletion(profile);
  const activeQuest = quests[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:px-6">
      <BeaconCenter />
      <section className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Profile completion"
          value={isClient ? `${completion}%` : "—"}
          hint={profileReady(profile) ? "Skill graph ready" : "Add skills on your profile"}
        />
        <Stat
          label="Active quests"
          value={isClient ? String(quests.length) : "—"}
          hint="Accepted collaborations"
        />
      </section>

      <section className="glass rounded-xl p-6">
        {!isClient ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : activeQuest ? (
          <div>
            <h2 className="text-sm font-medium text-white">Current quest</h2>
            <p className="mt-3 text-lg font-medium text-white">{activeQuest.quest.title}</p>
            <p className="mt-1 text-xs text-slate-400">With {activeQuest.partnerName}</p>
            <Link href="/workspace" className="mt-4 inline-flex text-xs font-medium text-[#ccff00]">
              Open workspace
            </Link>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-300">
              Your workspace is quiet. Invite a partner to start.
            </p>
            <Link href="/find-partners" className="mt-4 inline-flex text-xs font-medium text-[#ccff00]">
              Find a partner
            </Link>
          </div>
        )}
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

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="glass rounded-xl px-4 py-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-medium text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </article>
  );
}
