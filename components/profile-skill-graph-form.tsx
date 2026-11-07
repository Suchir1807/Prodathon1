"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ProfileStatsCard, type ProfileStats } from "@/components/profile-stats-card";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STARTER_PROFILE } from "@/lib/catalog";
import { displayName, formatUsername } from "@/lib/profile";
import { liveStateFromDraft } from "@/lib/profile-payload";
import type { Profile } from "@/lib/types";
import { profileSchema, type ProfileValues } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";
import { SkillPicker } from "@/components/skill-picker";
import type { z } from "zod";

export function ProfileSkillGraphForm({
  mode,
  username,
  stats,
  draft,
  onDraftChange,
  saving,
  toast,
  submitLabel,
  onSubmit,
}: {
  mode: "onboarding" | "edit";
  username: string;
  stats?: ProfileStats;
  draft: Profile;
  onDraftChange: (partial: Partial<Profile>) => void;
  saving: boolean;
  toast: string | null;
  submitLabel: string;
  onSubmit: (values: ProfileValues) => Promise<void>;
}) {
  const live = liveStateFromDraft(draft);
  const previewName = displayName(draft, username);
  const isOnboarding = mode === "onboarding";
  const [onboardingStep, setOnboardingStep] = useState(0);
  const submissionRef = useRef(false);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof profileSchema>, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: live,
  });

  function setSkills(field: "skillsHave" | "skillsLearn", values: string[]) {
    setValue(field, values, { shouldDirty: true, shouldValidate: true });
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    if (isOnboarding && onboardingStep < 2) {
      event.preventDefault();
      setOnboardingStep((step) => step + 1);
      return;
    }
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
              ? " Choose skills you can share and skills you want to learn."
              : " Update what you can offer and what you want to learn."}
          </p>
          {isOnboarding ? (
            <ol className="mt-6 grid max-w-2xl grid-cols-3 gap-2" aria-label="Profile setup progress">
              {["Pick skills", "Set goals", "Meet your match"].map((label, index) => {
                const complete = index < onboardingStep;
                const current = index === onboardingStep;
                return (
                  <li
                    key={label}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex min-w-0 items-center gap-2 border-t-2 pt-2 text-[10px] sm:text-xs",
                      complete || current ? "border-emerald-300 text-emerald-100" : "border-white/10 text-slate-500",
                    )}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[9px]">
                      {complete ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="truncate">{label}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>

        {(!isOnboarding || onboardingStep === 0) ? <section className="glass rounded-xl p-5">
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
                    })()
                  }
                >
                  <Sparkles />
                  Use starter profile
                </Button>
              ) : null}
            </div>
          </div>
        </section> : null}

        {(!isOnboarding || onboardingStep === 0) ? <SkillPicker
          title="Skills I can offer"
          selected={live.skillsHave}
          otherSelected={live.skillsLearn}
          onChange={(next) => {
            onDraftChange({ canTeach: next });
            setSkills("skillsHave", next);
          }}
        /> : null}
        {(!isOnboarding || onboardingStep === 1) ? <SkillPicker
          title="Skills I want to learn"
          selected={live.skillsLearn}
          otherSelected={live.skillsHave}
          onChange={(next) => {
            onDraftChange({ wantsToLearn: next });
            setSkills("skillsLearn", next);
          }}
        /> : null}

        {isOnboarding && onboardingStep === 2 ? (
          <section className="glass rounded-2xl p-6 sm:p-8">
            <span className="grid size-11 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200">
              <Sparkles className="size-5" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-white">
              Your next learning partner is one step away.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
              We’ll use your offered skills and learning goals to help you find a useful match.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-medium tracking-wide text-emerald-200/70 uppercase">You can teach</p>
                <p className="mt-2 text-sm text-white">
                  {live.skillsHave.length ? live.skillsHave.join(" · ") : "Add skills later from your profile"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-wide text-sky-200/70 uppercase">You want to learn</p>
                <p className="mt-2 text-sm text-white">
                  {live.skillsLearn.length ? live.skillsLearn.join(" · ") : "Add learning goals later from your profile"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {isOnboarding ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {onboardingStep > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setOnboardingStep((step) => step - 1)}>
                <ArrowLeft />
                Back
              </Button>
            ) : <span />}
            {onboardingStep < 2 ? (
              <Button type="button" onClick={() => setOnboardingStep((step) => step + 1)}>
                {onboardingStep === 0 ? "Set your goals" : "Find your first match"}
                <ArrowRight />
              </Button>
            ) : (
              <Button type="submit" loading={saving || isSubmitting} disabled={saving || isSubmitting}>
                <Sparkles />
                {submitLabel}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <aside className="lg:col-span-1">
        <ProfileStatsCard stats={stats ?? { sessions: 0, credits: 2, rating: 0}} />
      </aside>
    </form>
  );
}
