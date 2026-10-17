"use client";

import { Sparkles } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  LiveIdCard,
  type ProfileSocialStats,
  type ProfileSocialUsers,
} from "@/components/live-id-card";
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
import { profileSchema, type ProfileValues } from "@/lib/validation/schemas";
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
  stats,
  socialUsers,
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
  stats?: ProfileSocialStats;
  socialUsers?: ProfileSocialUsers;
  draft: Profile;
  onDraftChange: (partial: Partial<Profile>) => void;
  saving: boolean;
  saved: boolean;
  toast: string | null;
  submitLabel: string;
  onSubmit: (values: ProfileValues) => Promise<void>;
}) {
  const live = liveStateFromDraft(draft);
  const previewName = displayName(draft, username);
  const isOnboarding = mode === "onboarding";
  const submissionRef = useRef(false);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: live,
  });

  function setSkills(field: "skillsHave" | "skillsLearn" | "domainInterests", values: string[]) {
    setValue(field, values, { shouldDirty: true, shouldValidate: true });
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    if (submissionRef.current) return;
    submissionRef.current = true;
    void handleSubmit(onSubmit)(event).finally(() => {
      submissionRef.current = false;
    });
  }

  return (
    <form
      className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:px-6 lg:grid-cols-3"
      onSubmit={submitForm}
      noValidate
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
                placeholder={formatUsername(username)}
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? "profile-display-name-error" : undefined}
                {...register("displayName", {
                  onChange: (event) => onDraftChange({ name: event.target.value }),
                })}
                className={errors.displayName ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}
              />
              {errors.displayName ? (
                <p id="profile-display-name-error" className="text-xs font-mono text-rose-500">
                  {errors.displayName.message}
                </p>
              ) : null}
              {isOnboarding ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    (() => {
                      onDraftChange({
                        name: STARTER_PROFILE.name,
                        canTeach: [...STARTER_PROFILE.canTeach],
                        wantsToLearn: [...STARTER_PROFILE.wantsToLearn],
                        domains: [...STARTER_PROFILE.domains],
                      });
                      setValue("displayName", STARTER_PROFILE.name, { shouldDirty: true });
                      setSkills("skillsHave", [...STARTER_PROFILE.canTeach]);
                      setSkills("skillsLearn", [...STARTER_PROFILE.wantsToLearn]);
                      setSkills("domainInterests", [...STARTER_PROFILE.domains]);
                    })()
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
          onToggle={(value) => {
            const next = toggleInList(live.skillsHave, value);
            onDraftChange({ canTeach: next });
            setSkills("skillsHave", next);
          }}
        />
        <SkillSection
          title="Skills I Want to Learn"
          description="What you want the quest to make you practice."
          options={SKILLS_I_WANT}
          selected={live.skillsLearn}
          onToggle={(value) => {
            const next = toggleInList(live.skillsLearn, value);
            onDraftChange({ wantsToLearn: next });
            setSkills("skillsLearn", next);
          }}
        />
        <SkillSection
          title="Domain Interests"
          description="The kinds of products you actually want to build."
          options={DOMAIN_INTERESTS}
          selected={live.domainInterests}
          onToggle={(value) => {
            const next = toggleInList(live.domainInterests, value);
            onDraftChange({ domains: next });
            setSkills("domainInterests", next);
          }}
        />
      </div>

      <aside className="lg:col-span-1">
        <LiveIdCard
          username={username}
          live={live}
          stats={stats}
          socialUsers={socialUsers}
          saving={saving || isSubmitting}
          saved={saved}
          submitLabel={submitLabel}
          isOnboarding={isOnboarding}
        />
      </aside>
    </form>
  );
}
