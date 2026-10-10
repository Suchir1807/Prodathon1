"use client";

import { Check, Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { displayName, formatUsername } from "@/lib/profile";
import type { ProfileLiveState } from "@/lib/profile-payload";
import { cn } from "@/lib/utils";

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
  saving,
  saved,
  submitLabel,
  isOnboarding,
}: {
  username: string;
  live: ProfileLiveState;
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

      <div className="mt-4 space-y-3">
        <PreviewSkills label="Can teach" skills={live.skillsHave} />
        <PreviewSkills label="Wants to learn" skills={live.skillsLearn} />
      </div>

      <Button
        type="submit"
        disabled={saving}
        className={cn(
          "mt-6 h-12 w-full border-transparent bg-[#ccff00] text-base font-semibold text-[#0a0f1c]",
          "hover:border-transparent hover:bg-[#d6ff4a] hover:text-[#0a0f1c] hover:shadow-[0_0_18px_rgba(204,255,0,0.55)]",
        )}
      >
        {saving ? <Loader2 className="animate-spin" /> : null}
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
