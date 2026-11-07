"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeCheck, Clock3, Flame, Star } from "lucide-react";

import { SkillPicker } from "@/components/skill-picker";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import type { SkillLevel } from "@/lib/skill-categories";

type Review = {
  id: string;
  reviewerName: string;
  topic: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

type ProfileData = {
  username: string;
  displayName: string;
  bio: string;
  skillsHave: string[];
  skillsHaveLevels: Record<string, SkillLevel>;
  skillsLearn: string[];
  domainInterests: string[];
  timezone: string;
  rating: number;
  streak: number;
  creditBalance: number;
  ledger: Array<{ id: string; amount: number; type: string; createdAt: string }>;
  verifiedSkills: Array<{ skill: string; sessionCount: number; averageRating: number }>;
  badges: Array<{ id: string; skill: string; verifiedAt: string }>;
  reviews: Review[];
  socialStats?: { sessions: number };
};

type Availability = {
  available: boolean;
  availableUntil: string | null;
  availableFor: string[];
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyHelpNowLimit: number;
};

const EMPTY_AVAILABILITY: Availability = {
  available: false,
  availableUntil: null,
  availableFor: [],
  timezone: "UTC",
  quietHoursStart: "",
  quietHoursEnd: "",
  dailyHelpNowLimit: 5,
};

async function loadJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Unable to load profile.");
  return data;
}

export function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [availability, setAvailability] = useState<Availability>(EMPTY_AVAILABILITY);
  const [tab, setTab] = useState<"OVERVIEW" | "EDIT">("OVERVIEW");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skillsHave, setSkillsHave] = useState<string[]>([]);
  const [skillsLearn, setSkillsLearn] = useState<string[]>([]);
  const [skillsHaveLevels, setSkillsHaveLevels] = useState<Record<string, SkillLevel>>({});
  const [availabilityDuration, setAvailabilityDuration] = useState<30 | 60 | 120>(60);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      loadJson<ProfileData>("/api/profile"),
      loadJson<Availability>("/api/availability"),
    ]).then(([data, available]) => {
      if (!active) return;
      setProfile(data);
      setDisplayName(data.displayName);
      setBio(data.bio ?? "");
      setSkillsHave(data.skillsHave);
      setSkillsLearn(data.skillsLearn);
      setSkillsHaveLevels(data.skillsHaveLevels ?? {});
      setAvailability({ ...EMPTY_AVAILABILITY, ...available });
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Profile.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentTimezone = availability.timezone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const updated = await loadJson<ProfileData>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName,
          bio,
          skillsHave,
          skillsHaveLevels,
          skillsLearn,
          domainInterests: [],
          timezone: currentTimezone,
        }),
      });
      const savedAvailability = await loadJson<Availability>("/api/availability", {
        method: "PUT",
        body: JSON.stringify({
          available: availability.available,
          durationMinutes: availabilityDuration,
          availableFor: availability.availableFor,
          timezone: currentTimezone,
          quietHoursStart: availability.quietHoursStart,
          quietHoursEnd: availability.quietHoursEnd,
          dailyHelpNowLimit: availability.dailyHelpNowLimit,
        }),
      });
      setProfile({ ...profile, ...updated });
      setAvailability({ ...availability, ...savedAvailability });
      setMessage("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-400">Loading Profile…</p>;
  if (!profile) return <p role="alert" className="mx-auto max-w-5xl px-4 py-10 text-sm text-rose-300">{error || "Profile unavailable."}</p>;

  const name = displayName.trim() || profile.displayName || profile.username || session?.user?.name || "Skillin member";
  const username = profile.username || session?.user?.name || "";
  const sessions = profile.socialStats?.sessions ?? 0;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-200/75 uppercase">Your profile</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-white">Profile</h1>
          <p className="mt-2 text-sm text-slate-400">Your public overview and the skills you declare are kept separate.</p>
        </div>
        <Link href={`/u/${encodeURIComponent(username)}`} className="text-sm text-emerald-200 hover:text-white">View public profile</Link>
      </header>
      <div role="tablist" aria-label="Profile sections" className="mt-6 flex w-fit gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["OVERVIEW", "EDIT"] as const).map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-xs font-semibold tracking-wide ${tab === value ? "bg-emerald-300/10 text-emerald-100" : "text-slate-400 hover:text-white"}`}>{value}</button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-200">{error}</p> : null}
      {message ? <p role="status" className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-100">{message}</p> : null}

      {tab === "OVERVIEW" ? (
        <section className="mt-5 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start gap-4">
              <UserAvatar name={name} className="size-16 text-base" />
              <div><h2 className="text-xl font-semibold text-white">{name}</h2><p className="mt-1 text-xs text-slate-500">@{username}</p>{profile.bio ? <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{profile.bio}</p> : <p className="mt-3 text-sm text-slate-500">Add a short bio in Edit.</p>}</div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <Stat label="Credits" value={String(profile.creditBalance)} />
              <Stat label="Sessions" value={String(sessions)} />
              <Stat label="Rating" value={profile.rating ? `${profile.rating.toFixed(1)} / 5` : "New"} />
              <Stat label="Streak" value={`${profile.streak} days`} />
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><BadgeCheck className="size-4 text-emerald-200" />Verified skills</h2>
              <div className="mt-4 space-y-2">{profile.verifiedSkills.length ? profile.verifiedSkills.map((item) => <div key={item.skill} className="flex justify-between gap-3 rounded-lg border border-emerald-300/15 p-3 text-xs"><span className="text-emerald-100">{item.skill}</span><span className="text-slate-400">{item.sessionCount} sessions · {item.averageRating ? `${item.averageRating.toFixed(1)} rating` : "rating pending"}</span></div>) : <p className="text-sm text-slate-500">Skills are verified after a completed Session receives a review.</p>}</div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="size-4 text-sky-200" />Recent credit ledger</h2>
              <div className="mt-4 space-y-2">{profile.ledger.length ? profile.ledger.map((entry) => <div key={entry.id} className="flex justify-between gap-3 border-b border-white/5 pb-2 text-xs"><span className="text-slate-400">{entry.type.replaceAll("_", " ")}</span><span className={entry.amount >= 0 ? "text-emerald-200" : "text-rose-200"}>{entry.amount > 0 ? "+" : ""}{entry.amount} min</span></div>) : <p className="text-sm text-slate-500">No credit activity yet.</p>}</div>
            </section>
          </div>
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Flame className="size-4 text-amber-200" />Badges & received reviews</h2>
            <div className="mt-3 flex flex-wrap gap-2">{profile.badges.length ? profile.badges.map((badge) => <span key={badge.id} className="rounded-full border border-amber-200/20 bg-amber-200/[0.05] px-3 py-1 text-xs text-amber-100">{badge.skill} · verified</span>) : <span className="text-xs text-slate-500">Badges are earned through reviewed Sessions.</span>}</div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">{profile.reviews.length ? profile.reviews.map((review) => <article key={review.id} className="rounded-xl border border-white/8 p-3"><div className="flex justify-between gap-3"><p className="text-sm font-medium text-white">{review.reviewerName}</p><span className="inline-flex items-center gap-1 text-xs text-amber-100"><Star className="size-3" />{review.rating}/5</span></div><p className="mt-1 text-[11px] text-slate-500">{review.topic}</p><p className="mt-2 text-sm text-slate-300">{review.feedback || "Quick review received."}</p></article>) : <p className="text-sm text-slate-500">Received reviews will appear here.</p>}</div>
          </section>
        </section>
      ) : (
        <form onSubmit={(event) => void save(event)} className="mt-5 space-y-5">
          <section aria-label="Profile live stats" className="grid gap-3 sm:grid-cols-3">
            <Stat label="Credits" value={String(profile.creditBalance)} />
            <Stat label="Sessions" value={String(sessions)} />
            <Stat label="Rating" value={profile.rating ? `${profile.rating.toFixed(1)} / 5` : "New"} />
          </section>
          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2">
            <label className="text-xs text-slate-400">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>
            <label className="text-xs text-slate-400 sm:col-span-2">Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={3} placeholder="What are you learning or happy to share?" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <SkillPicker title="Skills I can offer" selected={skillsHave} otherSelected={skillsLearn} onChange={setSkillsHave} levels={skillsHaveLevels} onLevelsChange={setSkillsHaveLevels} />
            <SkillPicker title="Skills I want to learn" selected={skillsLearn} otherSelected={skillsHave} onChange={setSkillsLearn} />
          </div>
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-sm font-medium text-white">Availability</h2>
            <p className="mt-1 text-xs text-slate-500">Choose which offered skills can receive Help Now requests.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={availability.available} onChange={(event) => setAvailability({ ...availability, available: event.target.checked })} />Available now</label>
              <select value={availabilityDuration} onChange={(event) => setAvailabilityDuration(Number(event.target.value) as 30 | 60 | 120)} className="rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-xs text-white"><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={120}>120 minutes</option></select>
            </div>
            <div className="mt-4"><SkillPicker title="Available for" selected={availability.availableFor} otherSelected={[]} onChange={(availableFor) => setAvailability({ ...availability, availableFor })} /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-slate-400">Timezone<input required maxLength={80} value={availability.timezone} onChange={(event) => setAvailability({ ...availability, timezone: event.target.value })} placeholder="e.g. Asia/Kolkata" className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-2 text-white" /></label>
              <label className="text-xs text-slate-400">Quiet hours start<input type="time" value={availability.quietHoursStart} onChange={(event) => setAvailability({ ...availability, quietHoursStart: event.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-2 text-white" /></label>
              <label className="text-xs text-slate-400">Quiet hours end<input type="time" value={availability.quietHoursEnd} onChange={(event) => setAvailability({ ...availability, quietHoursEnd: event.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-2 text-white" /></label>
              <label className="text-xs text-slate-400">Daily request cap<input type="number" min={1} max={20} value={availability.dailyHelpNowLimit} onChange={(event) => setAvailability({ ...availability, dailyHelpNowLimit: Number(event.target.value) })} className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-2 text-white" /></label>
            </div>
          </section>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07110c]/95 px-4 py-3 backdrop-blur-xl md:left-16 md:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><p className="hidden text-xs text-slate-500 sm:block">Declared skills are separate from earned verification.</p><Button type="submit" loading={saving}>Save profile</Button></div>
          </div>
        </form>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>;
}
