"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayName, formatUsername } from "@/lib/profile";
import type { ProfileLiveState } from "@/lib/profile-payload";
import { cn } from "@/lib/utils";

export type ProfileSocialStats = {
  sprints: number;
  followers: number;
  following: number;
};

export type ProfileSocialUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type ProfileSocialUsers = {
  followers: ProfileSocialUser[];
  following: ProfileSocialUser[];
};

export function ProfileSocialStatsRow({
  stats,
  users,
}: {
  stats: ProfileSocialStats;
  users?: ProfileSocialUsers;
}) {
  const [activeList, setActiveList] = useState<"followers" | "following" | null>(null);
  const list = activeList ? users?.[activeList] ?? [] : [];

  return (
    <>
      <div className="mt-4 grid grid-cols-3 border-y border-white/8 py-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{stats.sprints}</p>
          <p className="text-[10px] text-neutral-500 uppercase">Sprints</p>
        </div>
        {([
          ["followers", "Followers", stats.followers],
          ["following", "Following", stats.following],
        ] as const).map(([listType, label, count]) => (
          <button
            key={listType}
            type="button"
            onClick={() => setActiveList(listType)}
            className="cursor-pointer text-center transition-opacity hover:opacity-80 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ccff00]"
            aria-label={`View ${count} ${label.toLowerCase()}`}
          >
            <p className="text-sm font-semibold text-white">{count}</p>
            <p className="text-[10px] text-neutral-500 uppercase">{label}</p>
          </button>
        ))}
      </div>

      <Dialog
        open={activeList !== null}
        onOpenChange={(open) => {
          if (!open) setActiveList(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden border border-white/10 bg-[#10121c] p-0 text-white shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:max-w-md">
          <DialogHeader className="border-b border-white/10 px-5 py-4 pr-12">
            <DialogTitle className="text-white">
              {activeList === "followers" ? "Followers" : "Following"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {list.length} {list.length === 1 ? "person" : "people"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
            {list.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-slate-500">
                {activeList === "followers" ? "No followers yet." : "Not following anyone yet."}
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {list.map((user) => {
                  const name = user.displayName.trim() || user.username;
                  return (
                    <li key={user.id} className="flex items-center gap-3 px-2 py-3">
                      <UserAvatar name={name} className="size-9 text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{name}</p>
                        <p className="truncate text-xs text-slate-500">@{user.username}</p>
                      </div>
                      <Link
                        href={`/profile/${encodeURIComponent(user.id)}`}
                        onClick={() => setActiveList(null)}
                        className="shrink-0 text-[11px] font-medium text-[#ccff00] hover:underline"
                      >
                        View Profile
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewSkills({ label, skills }: { label: string; skills: string[] }) {
  return (
    <div>
      <p className="text-[10px] tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.length === 0 ? (
          <span className="text-[11px] text-slate-600">None yet</span>
        ) : (
          skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-[#ccff00]/70 bg-[#ccff00]/10 px-2 py-0.5 text-[10px] text-[#ccff00]"
            >
              {skill}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function LiveIdCard({
  username,
  live,
  stats,
  socialUsers,
  saving,
  saved,
  submitLabel,
  isOnboarding,
}: {
  username: string;
  live: ProfileLiveState;
  stats?: ProfileSocialStats;
  socialUsers?: ProfileSocialUsers;
  saving: boolean;
  saved: boolean;
  submitLabel: string;
  isOnboarding: boolean;
}) {
  const previewProfile = {
    name: live.displayName,
    canTeach: live.skillsHave,
    wantsToLearn: live.skillsLearn,
    domains: live.domainInterests,
  };
  const previewName = displayName(previewProfile, username);

  return (
    <div className="sticky top-20 rounded-xl border border-[#ccff00]/25 bg-[#10182b]/55 p-4 shadow-[0_0_24px_rgba(204,255,0,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-wide text-slate-500 uppercase">Live ID card</p>
        <span className="flex items-center gap-1.5 text-[11px] text-[#ccff00]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#ccff00]" />
          Preview
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <UserAvatar name={previewName} className="size-14 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-white">
            {live.displayName.trim() || formatUsername(username)}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {live.domainInterests.length > 0
              ? live.domainInterests.join(" · ")
              : "Add a domain"}
          </p>
        </div>
      </div>

      <ProfileSocialStatsRow
        stats={stats ?? { sprints: 0, followers: 0, following: 0 }}
        users={socialUsers}
      />

      <div className="mt-4 space-y-3">
        <PreviewSkills label="Can teach" skills={live.skillsHave} />
        <PreviewSkills label="Wants to learn" skills={live.skillsLearn} />
      </div>

      <Button
        type="submit"
        loading={saving}
        className={cn(
          "mt-6 h-12 w-full border-transparent bg-[#ccff00] text-base font-semibold text-[#0a0f1c]",
          "hover:border-transparent hover:bg-[#d6ff4a] hover:text-[#0a0f1c] hover:shadow-[0_0_18px_rgba(204,255,0,0.55)]",
        )}
      >
        {!saving && saved && !isOnboarding ? <Check /> : null}
        {saving ? "Saving..." : submitLabel}
      </Button>
      <p className="mt-3 text-center text-[11px] text-slate-500">
        {isOnboarding
          ? "Updates as you type. Nothing is published until you initialize."
          : "Updates as you type. Save when you are ready."}
      </p>
    </div>
  );
}
