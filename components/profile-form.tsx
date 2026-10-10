"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { ProfileSkillGraphForm } from "@/components/profile-skill-graph-form";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { EMPTY_PROFILE } from "@/lib/catalog";
import { buildProfileSavePayload } from "@/lib/profile-payload";
import { profileFromUser } from "@/lib/user-profile";
import type { Profile } from "@/lib/types";

type ApiProfile = {
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  isProfileComplete: boolean;
  error?: string;
};

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
          router.replace("/workspace");
          return;
        }

        if (!cancelled) {
          setDraft(apiToProfile(data));
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProfileSavePayload(draft)),
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
      setToast("Profile initialized — opening workspace…");
      window.setTimeout(() => router.push("/workspace"), 700);
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!isClient || status === "loading" || loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-8 text-sm text-slate-400 md:px-6">
        <Loader2 className="size-4 animate-spin text-[#ccff00]" />
        Loading profile…
      </div>
    );
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
      draft={draft}
      onDraftChange={patchDraft}
      saving={saving}
      saved={false}
      toast={toast}
      submitLabel="Initialize profile"
      onSubmit={handleSubmit}
    />
  );
}
