"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, Check, Sparkles } from "lucide-react";

import { useIsClient, useProfile } from "@/components/profile-provider";
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
import { displayName } from "@/lib/profile";
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

function ProfileEditor({ initialProfile }: { initialProfile: Profile }) {
  const { saveProfile } = useProfile();
  const [draft, setDraft] = useState<Profile>(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = displayName(draft);

  function update(partial: Partial<Profile>) {
    setSaved(false);
    setDraft((current) => ({ ...current, ...partial }));
  }

  return (
    <form
      className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:px-6 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        saveProfile(draft);
        setSaved(true);
      }}
    >
      <div className="flex flex-col gap-5 lg:col-span-2">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#ccff00] uppercase">Onboarding</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Set your skill graph</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Teach one skill, learn another. The card on the right is how partners will see you.
          </p>
        </div>

        <section className="glass rounded-xl p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <label className="group relative size-24 shrink-0 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload profile picture"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") setAvatarUrl(reader.result);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <span className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-[#ccff00]/70 shadow-[0_0_18px_rgba(204,255,0,0.35)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <UserAvatar name={name} className="size-24 border-0 text-lg" />
                )}
              </span>
              <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border border-[#ccff00]/70 bg-slate-900 text-[#ccff00]">
                <Camera className="size-3.5" />
              </span>
            </label>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={draft.name}
                placeholder="Alex Rivera"
                onChange={(event) => update({ name: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(STARTER_PROFILE);
                  setSaved(false);
                }}
              >
                <Sparkles />
                Use starter profile
              </Button>
            </div>
          </div>
        </section>

        <SkillSection
          title="Skills I Have"
          description="What you can teach a partner this week."
          options={SKILLS_I_HAVE}
          selected={draft.canTeach}
          onToggle={(value) => update({ canTeach: toggleInList(draft.canTeach, value) })}
        />
        <SkillSection
          title="Skills I Want to Learn"
          description="What you want the quest to make you practice."
          options={SKILLS_I_WANT}
          selected={draft.wantsToLearn}
          onToggle={(value) => update({ wantsToLearn: toggleInList(draft.wantsToLearn, value) })}
        />
        <SkillSection
          title="Domain Interests"
          description="The kinds of products you actually want to build."
          options={DOMAIN_INTERESTS}
          selected={draft.domains}
          onToggle={(value) => update({ domains: toggleInList(draft.domains, value) })}
        />
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-20 rounded-xl border border-[#ccff00]/25 bg-[#10182b]/55 p-4 shadow-[0_0_24px_rgba(204,255,0,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-wide text-slate-500 uppercase">Live ID card</p>
            <span className="flex items-center gap-1.5 text-[11px] text-[#ccff00]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#ccff00]" />
              Preview
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full shadow-[0_0_16px_rgba(204,255,0,0.28)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-14 rounded-full object-cover" />
              ) : (
                <UserAvatar name={name} className="size-14 text-sm" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-white">{name}</p>
              <p className="truncate text-[11px] text-slate-500">
                {draft.domains.length > 0 ? draft.domains.join(" · ") : "Add a domain"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PreviewSkills label="Can teach" skills={draft.canTeach} />
            <PreviewSkills label="Wants to learn" skills={draft.wantsToLearn} />
          </div>

          <Button
            type="submit"
            className="mt-6 h-12 w-full border-transparent bg-[#ccff00] text-base font-semibold text-[#0a0f1c] hover:border-transparent hover:bg-[#d6ff4a] hover:text-[#0a0f1c] hover:shadow-[0_0_18px_rgba(204,255,0,0.55)]"
          >
            {saved ? <Check /> : null}
            {saved ? "Profile saved" : "Initialize profile"}
          </Button>
          {saved ? (
            <Button variant="outline" className="mt-2 w-full" asChild>
              <Link href="/find-partners">Find a partner</Link>
            </Button>
          ) : (
            <p className="mt-3 text-center text-[11px] text-slate-500">
              Updates as you type. Nothing is published until you initialize.
            </p>
          )}
        </div>
      </aside>
    </form>
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
              className={cn(
                "rounded-full border border-[#ccff00]/70 bg-[#ccff00]/10 px-2 py-0.5 text-[10px] text-[#ccff00]",
              )}
            >
              {skill}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function ProfileForm() {
  const { profile } = useProfile();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-400 md:px-6">
        Loading profile…
      </div>
    );
  }

  return <ProfileEditor initialProfile={profile} />;
}
