"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2 } from "lucide-react";

import { ProfileLogoutButton } from "@/components/profile-logout-button";
import { ToggleChip } from "@/components/toggle-chip";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/components/profile-provider";
import {
  DOMAIN_INTERESTS,
  SKILLS_I_HAVE,
  SKILLS_I_WANT,
} from "@/lib/catalog";
import { formatUsername } from "@/lib/profile";
import { cn } from "@/lib/utils";

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function SkillChips({
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
  onToggle: (skill: string) => void;
}) {
  return (
    <section className="glass rounded-xl p-5">
      <h2 className="text-sm font-medium text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((skillName) => (
          <ToggleChip
            key={skillName}
            selected={selected.includes(skillName)}
            onClick={() => onToggle(skillName)}
            className="px-3 py-1 text-xs"
          >
            {skillName}
          </ToggleChip>
        ))}
      </div>
    </section>
  );
}

function IdList({ label, skills }: { label: string; skills: string[] }) {
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

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { saveProfile } = useProfile();
  const username = session?.user?.name ?? "";

  const [displayName, setDisplayName] = useState("");
  const [skillsHave, setSkillsHave] = useState<string[]>([]);
  const [skillsLearn, setSkillsLearn] = useState<string[]>([]);
  const [domainInterests, setDomainInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = (await response.json()) as {
          displayName?: string;
          skillsHave?: unknown;
          skillsLearn?: unknown;
          domainInterests?: unknown;
          error?: string;
        };

        if (!response.ok) {
          if (!cancelled) setLoadError(data.error ?? "Could not load profile.");
          return;
        }

        const nextHave = asStringList(data.skillsHave);
        const nextLearn = asStringList(data.skillsLearn);
        const nextDomains = asStringList(data.domainInterests);
        const nextName = typeof data.displayName === "string" ? data.displayName : "";

        if (!cancelled) {
          setDisplayName(nextName);
          setSkillsHave(nextHave);
          setSkillsLearn(nextLearn);
          setDomainInterests(nextDomains);
          saveProfile({
            name: nextName,
            canTeach: nextHave,
            wantsToLearn: nextLearn,
            domains: nextDomains,
          });
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
    // Load once on mount so refresh always hydrates from MongoDB.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setToast(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          skillsHave,
          skillsLearn,
          domainInterests,
        }),
      });

      const data = (await response.json()) as {
        displayName?: string;
        skillsHave?: unknown;
        skillsLearn?: unknown;
        domainInterests?: unknown;
        error?: string;
      };

      if (!response.ok) {
        setToast(data.error ?? "Could not save profile.");
        return;
      }

      const nextHave = asStringList(data.skillsHave);
      const nextLearn = asStringList(data.skillsLearn);
      const nextDomains = asStringList(data.domainInterests);
      const nextName = typeof data.displayName === "string" ? data.displayName : displayName;

      setDisplayName(nextName);
      setSkillsHave(nextHave);
      setSkillsLearn(nextLearn);
      setDomainInterests(nextDomains);
      saveProfile({
        name: nextName,
        canTeach: nextHave,
        wantsToLearn: nextLearn,
        domains: nextDomains,
      });
      await updateSession({ isProfileComplete: true });
      setSaved(true);
      setToast("Changes saved.");
      window.setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const cardName = displayName.trim() || (username ? formatUsername(username) : "You");

  if (loading) {
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

  return (
    <>
      <form
        className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:px-6 lg:grid-cols-3"
        onSubmit={handleSave}
      >
        {toast ? (
          <p
            role="status"
            className={cn(
              "fixed top-20 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-md lg:top-6",
              toast.includes("Could not") || toast.includes("Network")
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-[#ccff00]/40 bg-[#10182b]/95 text-[#ccff00]",
            )}
          >
            {toast}
          </p>
        ) : null}

        <div className="flex flex-col gap-5 lg:col-span-2">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
              Profile
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Edit your skill graph
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {username ? (
                <>
                  Signed in as <span className="text-white">{formatUsername(username)}</span>.
                </>
              ) : (
                "Update what you teach, want to learn, and the domains you care about."
              )}
            </p>
          </div>

          <section className="glass rounded-xl p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <UserAvatar name={cardName} className="size-24 border border-[#ccff00]/70 text-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  placeholder={username ? formatUsername(username) : "Display name"}
                  onChange={(event) => {
                    setSaved(false);
                    setDisplayName(event.target.value);
                  }}
                />
              </div>
            </div>
          </section>

          <SkillChips
            title="Skills I Have"
            description="What you can teach a partner this week."
            options={SKILLS_I_HAVE}
            selected={skillsHave}
            onToggle={(skillName) => {
              setSaved(false);
              setSkillsHave((current) => toggleValue(current, skillName));
            }}
          />
          <SkillChips
            title="Skills I Want to Learn"
            description="What you want the quest to make you practice."
            options={SKILLS_I_WANT}
            selected={skillsLearn}
            onToggle={(skillName) => {
              setSaved(false);
              setSkillsLearn((current) => toggleValue(current, skillName));
            }}
          />
          <SkillChips
            title="Domain Interests"
            description="The kinds of products you actually want to build."
            options={DOMAIN_INTERESTS}
            selected={domainInterests}
            onToggle={(skillName) => {
              setSaved(false);
              setDomainInterests((current) => toggleValue(current, skillName));
            }}
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
              <UserAvatar name={cardName} className="size-14 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-white">{cardName}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {domainInterests.length > 0 ? domainInterests.join(" · ") : "Add a domain"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <IdList label="Can teach" skills={skillsHave} />
              <IdList label="Wants to learn" skills={skillsLearn} />
              <IdList label="Domains" skills={domainInterests} />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="mt-6 h-12 w-full border-transparent bg-[#ccff00] text-base font-semibold text-[#0a0f1c] hover:border-transparent hover:bg-[#d6ff4a] hover:text-[#0a0f1c] hover:shadow-[0_0_18px_rgba(204,255,0,0.55)]"
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              {!saving && saved ? <Check /> : null}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </aside>
      </form>
      <ProfileLogoutButton />
    </>
  );
}
