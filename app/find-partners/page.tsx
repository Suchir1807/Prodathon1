"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { useProfile } from "@/components/profile-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchInsight } from "@/lib/match";
import { formatUsername, profileReady } from "@/lib/profile";

type PartnerUser = {
  _id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  isFollowing: boolean;
};

function SkillPills({
  label,
  skills,
  matched = [],
}: {
  label: string;
  skills: string[];
  matched?: string[];
}) {
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-full text-[10px] font-medium tracking-wide text-slate-500 uppercase">{label}</span>
      {skills.slice(0, 5).map((skill) => (
        <span
          key={skill}
          className={
            matched.includes(skill)
              ? "rounded-full border border-signal/30 bg-signal/[0.08] px-2.5 py-1 text-[11px] text-signal"
              : "rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-300"
          }
        >
          {skill}
        </span>
      ))}
      {skills.length > 5 ? (
        <span className="text-[10px] text-slate-500">+{skills.length - 5}</span>
      ) : null}
    </div>
  );
}

export default function FindPartnersPage() {
  const { profile } = useProfile();
  const [partners, setPartners] = useState<PartnerUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const inviteRef = useRef(false);
  const profileComplete = profileReady(profile);

  const visiblePartners = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return partners
      .map((partner) => ({
        partner,
        insight: matchInsight(profile, {
          name: partner.displayName,
          canTeach: partner.skillsHave,
          wantsToLearn: partner.skillsLearn,
          domains: partner.domainInterests,
        }),
      }))
      .filter(({ partner }) => {
        if (!needle) return true;
        const searchable = [
          partner.displayName,
          partner.username,
          ...partner.skillsHave,
          ...partner.skillsLearn,
          ...partner.domainInterests,
        ];
        return searchable.some((value) => value.toLowerCase().includes(needle));
      })
      .sort((left, right) => right.insight.score - left.insight.score);
  }, [partners, profile, query]);

  useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        const data = (await response.json()) as PartnerUser[] | { error?: string; users?: PartnerUser[] };
        if (!response.ok) {
          const message = !Array.isArray(data) ? data.error : undefined;
          if (!cancelled) setError(message ?? "Could not load partners.");
          return;
        }
        const list = Array.isArray(data) ? data : (data.users ?? []);
        if (!cancelled) {
          setPartners(list);
          setFollowingIds(new Set(list.filter((partner) => partner.isFollowing).map((partner) => partner._id)));
        }
      } catch {
        if (!cancelled) setError("Network error loading partners.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPartners();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendInvite(receiverId: string) {
    if (inviteRef.current) return;
    inviteRef.current = true;
    setPendingId(receiverId);
    setInviteError("");
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to send invite.");
      setSentIds((current) => [...current, receiverId]);
    } catch (sendError) {
      setInviteError(sendError instanceof Error ? sendError.message : "Unable to send invite.");
    } finally {
      setPendingId(null);
      inviteRef.current = false;
    }
  }

  async function toggleFollow(targetUserId: string) {
    if (pendingFollowId) return;
    const wasFollowing = followingIds.has(targetUserId);
    setPendingFollowId(targetUserId);
    setInviteError("");
    setFollowingIds((current) => {
      const next = new Set(current);
      if (wasFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = (await response.json()) as { following?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update follow status.");
      if (data.following !== !wasFollowing) throw new Error("Follow status could not be confirmed.");
    } catch (followError) {
      setFollowingIds((current) => {
        const next = new Set(current);
        if (wasFollowing) next.add(targetUserId);
        else next.delete(targetUserId);
        return next;
      });
      setInviteError(followError instanceof Error ? followError.message : "Unable to update follow status.");
    } finally {
      setPendingFollowId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-72 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-[28rem] max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div role="status" aria-label="Loading builders" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="min-h-64 animate-pulse rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-7 space-y-4">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-6 w-full rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-6 w-4/5 rounded bg-muted" />
              </div>
            </div>
          ))}
          <span className="sr-only">Loading builders and their skill profiles…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="relative isolate overflow-hidden rounded-[1.5rem] border border-emerald-300/15 bg-forest-950 px-5 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.2)] sm:px-8 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_10%,rgba(217,243,106,0.12),transparent_35%),radial-gradient(ellipse_at_10%_100%,rgba(16,185,129,0.14),transparent_45%)]" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-emerald-200/70 uppercase">
              <UsersRound className="size-3.5" />
              Peer matching · 01
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Find your people.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/65">
              Meet builders who can teach what you want to learn—and want to learn what you can teach.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-300/10 text-emerald-200">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-white">Skill-first, people-led</p>
              <p className="mt-0.5 text-[10px] text-emerald-50/50">Start with a conversation</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Builder directory" className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-white">Builders to meet</h2>
              <p className="mt-1 text-xs text-slate-400">
                {visiblePartners.length} {visiblePartners.length === 1 ? "person" : "people"} in your view
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people or skills"
                aria-label="Search people or skills"
                className="pl-9"
              />
            </div>
          </div>

          {inviteError ? (
            <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {inviteError}
            </p>
          ) : null}

          {visiblePartners.length === 0 ? (
            <div className="mt-4 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200">
                <Compass className="size-5" />
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-white">
                {partners.length === 0 ? "Your first match is waiting" : "No builders found"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                {partners.length === 0
                  ? "As more builders join, you’ll find peers to trade skills and start a shared project with."
                  : "Try another name or skill, or clear your search to see everyone."}
              </p>
              {partners.length > 0 ? (
                <Button variant="outline" className="mt-5" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visiblePartners.map(({ partner, insight }) => {
                const name = partner.displayName.trim() || formatUsername(partner.username);
                const sent = sentIds.includes(partner._id);
                const pending = pendingId === partner._id;
                const followPending = pendingFollowId === partner._id;
                const following = followingIds.has(partner._id);
                const isMatched = profileComplete && insight.score > 0;

                return (
                  <article
                    key={partner._id}
                    className="group relative flex min-h-72 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1710]/90 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/25 hover:shadow-[0_18px_48px_rgba(16,185,129,0.08)] sm:p-5"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 size-40 rounded-full bg-emerald-400/[0.06] blur-3xl transition-opacity group-hover:opacity-150" />
                    <div className="relative flex items-start gap-3">
                      <UserAvatar name={name} className="size-12 border-emerald-100/15 text-sm" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-heading text-base font-semibold text-white">{name}</h3>
                        <p className="mt-0.5 truncate text-xs text-slate-500">@{partner.username}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="size-1.5 rounded-full bg-emerald-300" />
                          Skillin builder
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {profileComplete ? (
                          <>
                            <p className={`font-heading text-lg font-semibold ${isMatched ? "text-signal" : "text-slate-300"}`}>
                              {isMatched ? `${insight.score}%` : "—"}
                            </p>
                            <p className="text-[9px] text-slate-500">{isMatched ? "skill fit" : "new connection"}</p>
                          </>
                        ) : (
                          <Link href="/profile" className="text-[10px] font-medium text-signal hover:underline">
                            Add your skills
                          </Link>
                        )}
                      </div>
                    </div>

                    {profileComplete ? (
                      <div className="relative mt-4">
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${isMatched ? "bg-gradient-to-r from-emerald-400 to-lime-300" : "bg-slate-600"}`}
                            style={{ width: `${insight.score}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500" aria-label={isMatched ? `${insight.score} percent skill fit` : "No direct skill overlap yet"}>
                          {isMatched ? "Complementary skills found" : "No direct overlap yet"}
                        </p>
                      </div>
                    ) : null}

                    <div className="relative mt-5 flex-1 space-y-4">
                      <SkillPills label="Can teach" skills={partner.skillsHave} matched={insight.theyTeachYou} />
                      <SkillPills label="Wants to learn" skills={partner.skillsLearn} matched={insight.youTeachThem} />
                      <SkillPills label="Into" skills={partner.domainInterests} matched={insight.sharedDomains} />
                    </div>

                    <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
                      <Button
                        size="sm"
                        disabled={pending || sent}
                        loading={pending}
                        onClick={() => void sendInvite(partner._id)}
                        className="flex-1"
                      >
                        {sent ? <><Check /> Invite sent</> : pending ? "Sending…" : <>Invite to build <ArrowRight /></>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={followPending}
                        loading={followPending}
                        onClick={() => void toggleFollow(partner._id)}
                        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
                        className={following ? "px-3 text-slate-400" : "px-3"}
                      >
                        {following ? <><Check /> Following</> : "Follow"}
                      </Button>
                    </div>
                    <Link
                      href={`/profile/${partner._id}`}
                      className="relative mt-3 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-emerald-200"
                    >
                      View builder profile <ArrowRight className="size-3" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl lg:sticky lg:top-20">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">
            Your side of the match
          </p>
          <h2 className="mt-2 font-heading text-lg font-semibold text-white">Your skill signal</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Matching works best when both sides know what they can share.
          </p>
          <SkillPills label="You can teach" skills={profile.canTeach} />
          <SkillPills label="You want to learn" skills={profile.wantsToLearn} />
          <SkillPills label="Your domains" skills={profile.domains} />
          <div className="mt-5 border-t border-white/8 pt-4">
            <Link href="/profile" className="inline-flex items-center gap-2 text-xs font-semibold text-signal hover:underline">
              Complete your profile <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
