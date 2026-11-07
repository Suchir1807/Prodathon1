"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { PartnerCard } from "@/components/partner-card";
import {
  EMPTY_FILTERS,
  PartnerFilters,
  type PartnerFiltersState,
} from "@/components/partner-filters";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import { matchInsight } from "@/lib/match";
import { profileReady } from "@/lib/profile";
import type { Partner } from "@/lib/types";
import { publicUserToPartner, type PublicUser } from "@/lib/user-partner";
import { cn } from "@/lib/utils";
import { normalizeSkill, SKILL_CATEGORIES, type SkillCategory } from "@/lib/skill-categories";

const CATEGORY_BY_SKILL = new Map<string, SkillCategory>();
for (const [category, skills] of Object.entries(SKILL_CATEGORIES) as [SkillCategory, readonly string[]][]) {
  for (const skill of skills) CATEGORY_BY_SKILL.set(normalizeSkill(skill), category);
}

function passesFilters(
  partner: Partner,
  insight: ReturnType<typeof matchInsight>,
  filters: PartnerFiltersState,
  complementary: boolean,
) {
  const query = filters.query.trim().toLowerCase();
  if (query && !partner.name.toLowerCase().includes(query)) return false;
  if (
    complementary &&
    insight.theyTeachYou.length === 0 &&
    insight.youTeachThem.length === 0
  ) {
    return false;
  }
  const partnerSkills = [...partner.canTeach, ...partner.wantsToLearn];
  if (filters.categories.length > 0 && !partnerSkills.some((skill) =>
    filters.categories.includes(CATEGORY_BY_SKILL.get(normalizeSkill(skill)) ?? "Other"),
  )) {
    return false;
  }
  if (
    filters.canTeach.length > 0 &&
    !filters.canTeach.some((skill) => partner.canTeach.includes(skill))
  ) {
    return false;
  }
  if (
    filters.wantsToLearn.length > 0 &&
    !filters.wantsToLearn.some((skill) => partner.wantsToLearn.includes(skill))
  ) {
    return false;
  }
  return true;
}

export function PartnerBoard() {
  const { profile } = useProfile();
  const isClient = useIsClient();
  const [filters, setFilters] = useState<PartnerFiltersState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [directory, setDirectory] = useState<Partner[]>([]);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const inviteRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        const data = (await response.json()) as { users?: PublicUser[] };
        if (!response.ok || cancelled) return;
        const fromDb = (data.users ?? []).map(publicUserToPartner);
        setFollowingIds(new Set((data.users ?? []).filter((user) => user.isFollowing).map((user) => user.id)));
        if (fromDb.length > 0) {
          setDirectory(fromDb);
        }
      } catch {
        /* keep mock partners as fallback */
      }
    }
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const canCompare = profile.canTeach.length > 0 || profile.wantsToLearn.length > 0;
  const complementary = filters.complementaryOnly && canCompare;

  const results = useMemo(() => {
    return directory.map((partner) => ({
      partner,
      insight: matchInsight({ ...profile, domains: [] }, { ...partner, domains: [] }),
    }))
      .filter(({ partner, insight }) => passesFilters(partner, insight, filters, complementary))
      .sort((left, right) => right.insight.score - left.insight.score);
  }, [profile, filters, complementary, directory]);

  async function inviteToExchange(partner: Partner) {
    if (inviteRef.current) return;
    inviteRef.current = true;
    setPendingInviteId(partner.id);
    setActionError("");
    try {
      const response = await fetch("/api/exchange-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: partner.id, idempotencyKey: crypto.randomUUID() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to send invite.");
      setSentInvites((current) => new Set(current).add(partner.id));
      setActionError("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to send invite.");
    } finally {
      setPendingInviteId(null);
      inviteRef.current = false;
    }
  }

  async function toggleFollow(partner: Partner) {
    if (pendingFollowId) return;
    const wasFollowing = followingIds.has(partner.id);
    setPendingFollowId(partner.id);
    setActionError("");
    setFollowingIds((current) => {
      const next = new Set(current);
      if (wasFollowing) next.delete(partner.id);
      else next.add(partner.id);
      return next;
    });
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: partner.id }),
      });
      const data = (await response.json()) as { following?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update follow status.");
      if (data.following !== !wasFollowing) throw new Error("Follow status could not be confirmed.");
    } catch (error) {
      setFollowingIds((current) => {
        const next = new Set(current);
        if (wasFollowing) next.add(partner.id);
        else next.delete(partner.id);
        return next;
      });
      setActionError(error instanceof Error ? error.message : "Unable to update follow status.");
    } finally {
      setPendingFollowId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-xl text-sm text-slate-400">
            Find someone whose skills complement yours and invite them to start an ongoing Exchange.
          </p>
        </div>
        <Button
          variant="outline"
          className="lg:hidden"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal />
          {filtersOpen ? "Hide filters" : "Show filters"}
        </Button>
      </div>

      {isClient && !profileReady(profile) ? (
        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          Your skill graph is still empty, so fit scores stay low.{" "}
          <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
            Set your profile
          </Link>{" "}
          or load the starter profile to rank complementary partners.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside
          className={cn(
            "w-full shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:w-72 lg:overflow-y-auto",
            filtersOpen ? "block" : "hidden lg:block",
          )}
        >
          <PartnerFilters filters={filters} onChange={setFilters} />
        </aside>

        <div className="min-w-0 flex-1">
          {actionError ? <p role="alert" className="mb-3 text-xs text-rose-400">{actionError}</p> : null}
          <p className="mb-3 text-sm text-muted-foreground">
            {results.length} partner{results.length === 1 ? "" : "s"}
          </p>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No partners match these filters.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map(({ partner, insight }) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  insight={insight}
                  isFollowing={followingIds.has(partner.id)}
                  followPending={pendingFollowId === partner.id}
                  onToggleFollow={() => void toggleFollow(partner)}
                  requestPending={pendingInviteId === partner.id}
                  requestSent={sentInvites.has(partner.id)}
                  proposeDisabled={pendingInviteId !== null || sentInvites.has(partner.id)}
                  onRequest={() => void inviteToExchange(partner)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
