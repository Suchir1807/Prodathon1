"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { ProfileSkillGraphForm } from "@/components/profile-skill-graph-form";
import type { ProfileStats } from "@/components/profile-stats-card";
import { ProfileSkeleton } from "@/components/ui/loading-skeletons";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { EMPTY_PROFILE } from "@/lib/catalog";
import { profileFromUser } from "@/lib/user-profile";
import type { Profile } from "@/lib/types";
import type { ProfileValues } from "@/lib/validation/schemas";

type ApiProfile = {
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  creditBalance?: number;
  rating?: number;
  isProfileComplete: boolean;
  socialStats?: { sessions?: number };
  error?: string;
};

function socialCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function apiToProfile(data: ApiProfile): Profile {
  return profileFromUser({
    displayName: data.displayName,
    skillsHave: data.skillsHave,
    skillsLearn: data.skillsLearn,
    domainInterests: data.domainInterests,
  });
}

export function OnboardingForm() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const { saveProfile } = useProfile();
  const isClient = useIsClient();
  const username = session?.user?.name ?? "";

  const [draft, setDraft] = useState<Profile>({ ...EMPTY_PROFILE });
  const [socialStats, setSocialStats] = useState<ProfileStats>({
    sessions: 0,
    credits: 2,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated" || !username) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = (await response.json()) as ApiProfile;

        if (!response.ok) {
          if (!cancelled) {
            setLoadError(data.error ?? "Could not load profile.");
          }
          return;
        }

        if (data.isProfileComplete) {
          router.replace("/dashboard");
          return;
        }

        if (!cancelled) {
          setDraft(apiToProfile(data));
          setSocialStats({
            sessions: socialCount(data.socialStats?.sessions),
            credits: socialCount(data.creditBalance),
            rating: typeof data.rating === "number" ? data.rating : 0,
          });
        }
      } catch {
        if (!cancelled) {
          setLoadError("Network error loading profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, username, router]);

  const patchDraft = useCallback((partial: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  async function handleSubmit(values: ProfileValues) {
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as ApiProfile & {
        localProfile?: Profile;
        error?: string;
      };

      if (!response.ok) {
        setToast(data.error ?? "Could not save profile.");
        return;
      }

      const persisted = data.localProfile ?? apiToProfile(data);
      saveProfile(persisted);
      await updateSession({ isProfileComplete: true });
      setToast("Profile ready — finding your first learning partner…");
      window.setTimeout(() => router.push("/find-partners"), 700);
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!isClient || status === "loading" || loading) {
    return <ProfileSkeleton />;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-destructive md:px-6">
        {loadError}
      </div>
    );
  }

  if (!username) {
    return null;
  }

  return (
    <ProfileSkillGraphForm
      mode="onboarding"
      username={username}
      stats={socialStats}
      draft={draft}
      onDraftChange={patchDraft}
      saving={saving}
      toast={toast}
      submitLabel="Save profile & find partners"
      onSubmit={handleSubmit}
    />
  );
}
