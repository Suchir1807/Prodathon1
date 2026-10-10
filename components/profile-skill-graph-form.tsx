"use client";

import { Sparkles } from "lucide-react";

import { LiveIdCard } from "@/components/live-id-card";
import { ToggleChip, toggleInList } from "@/components/toggle-chip";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOMAIN_INTERESTS,
  SKILLS_I_HAVE,
  SKILLS_I_WANT,
  STARTER_PROFILE,
} from "@/lib/catalog";
import { displayName, formatUsername } from "@/lib/profile";
import { liveStateFromDraft } from "@/lib/profile-payload";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function SkillSection({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="glass rounded-xl p-5">
      <h2 className="text-sm font-medium text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip
            key={option}
            selected={selected.includes(option)}
            onClick={() => onToggle(option)}
            className="px-3 py-1 text-xs"
          >
            {option}
          </ToggleChip>
        ))}
      </div>
    </section>
  );
}

export function ProfileSkillGraphForm({
  mode,
  username,
  draft,
  onDraftChange,
  saving,
  saved,
  toast,
  submitLabel,
  onSubmit,
}: {
  mode: "onboarding" | "edit";
  username: string;
  draft: Profile;
  onDraftChange: (partial: Partial<Profile>) => void;
  saving: boolean;
  saved: boolean;
  toast: string | null;
  submitLabel: string;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const live = liveStateFromDraft(draft);
  const previewName = displayName(draft, username);
  const isOnboarding = mode === "onboarding";

  return (
    <form
      className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:px-6 lg:grid-cols-3"
      onSubmit={onSubmit}
    >
      {toast ? (
        <p
          role="status"
          className={cn(
            "fixed top-20 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-md lg:top-6",
            toast.includes("error") ||
              toast.includes("Could not") ||
              toast.includes("Network")
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-[#ccff00]/40 bg-[#10182b]/95 text-[#ccff00]",
          )}
        >
          {toast}
        </p>
      ) : null}

      <div className="flex flex-col gap-5 lg:col-span-2">
        <div>
          {isOnboarding ? (
            <p className="text-xs font-medium tracking-[0.18em] text-[#ccff00] uppercase">
              Onboarding
            </p>
          ) : (
            <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
              Profile
            </p>
          )}
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {isOnboarding ? "Set your skill graph" : "Edit your skill graph"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Signed in as{" "}
            <span className="text-white">{formatUsername(username)}</span>.
            {isOnboarding
              ? " The card on the right is how partners will see you."
              : " Update what you teach, want to learn, and the domains you care about."}
          </p>
        </div>

        <section className="glass rounded-xl p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar name={previewName} className="size-24 border border-[#ccff00]/70 text-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={live.displayName}
                placeholder={formatUsername(username)}
                onChange={(event) => onDraftChange({ name: event.target.value })}
              />
              {isOnboarding ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onDraftChange({
                      name: STARTER_PROFILE.name,
                      canTeach: [...STARTER_PROFILE.canTeach],
                      wantsToLearn: [...STARTER_PROFILE.wantsToLearn],
                      domains: [...STARTER_PROFILE.domains],
                    })
                  }
                >
                  <Sparkles />
                  Use starter profile
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <SkillSection
          title="Skills I Have"
          description="What you can teach a partner this week."
          options={SKILLS_I_HAVE}
          selected={live.skillsHave}
          onToggle={(value) =>
            onDraftChange({ canTeach: toggleInList(live.skillsHave, value) })
          }
        />
        <SkillSection
          title="Skills I Want to Learn"
          description="What you want the quest to make you practice."
          options={SKILLS_I_WANT}
          selected={live.skillsLearn}
          onToggle={(value) =>
            onDraftChange({ wantsToLearn: toggleInList(live.skillsLearn, value) })
          }
        />
        <SkillSection
          title="Domain Interests"
          description="The kinds of products you actually want to build."
          options={DOMAIN_INTERESTS}
          selected={live.domainInterests}
          onToggle={(value) =>
            onDraftChange({ domains: toggleInList(live.domainInterests, value) })
          }
        />
      </div>

      <aside className="lg:col-span-1">
        <LiveIdCard
          username={username}
          live={live}
          saving={saving}
          saved={saved}
          submitLabel={submitLabel}
          isOnboarding={isOnboarding}
        />
      </aside>
    </form>
  );
}
