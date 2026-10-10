"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { PartnerCard } from "@/components/partner-card";
import {
  EMPTY_FILTERS,
  PartnerFilters,
  type PartnerFiltersState,
} from "@/components/partner-filters";
import { useIsClient, useProfile } from "@/components/profile-provider";
import { QuestDialog, type QuestSession } from "@/components/quest-dialog";
import { Button } from "@/components/ui/button";
import { matchInsight } from "@/lib/match";
import { profileReady } from "@/lib/profile";
import { writeActiveWorkspace } from "@/lib/workspace";
import type { Partner, Profile, Quest, QuestResponse } from "@/lib/types";
import { publicUserToPartner, type PublicUser } from "@/lib/user-partner";
import { cn } from "@/lib/utils";

async function requestQuest(viewer: Profile, partner: Partner) {
  const started = Date.now();
  const response = await fetch("/api/generate-quest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentA: viewer, studentB: partner }),
  });
  const payload = (await response.json()) as QuestResponse & { error?: string };
  const elapsed = Date.now() - started;
  if (elapsed < 1600) {
    await new Promise((resolve) => window.setTimeout(resolve, 1600 - elapsed));
  }
  if (!response.ok) {
    throw new Error(payload.error || "Could not generate a quest.");
  }
  return payload;
}

function acceptedQuest(partner: Partner, quest: Quest) {
  return {
    id: crypto.randomUUID(),
    acceptedAt: new Date().toISOString(),
    partnerId: partner.id,
    partnerName: partner.name,
    quest,
  };
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
  if (
    filters.domains.length > 0 &&
    !filters.domains.some((domain) => partner.domains.includes(domain))
  ) {
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
  const router = useRouter();
  const { profile, acceptQuest } = useProfile();
  const isClient = useIsClient();
  const [filters, setFilters] = useState<PartnerFiltersState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<QuestSession | null>(null);
  const [directory, setDirectory] = useState<Partner[]>([]);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        const data = (await response.json()) as { users?: PublicUser[] };
        if (!response.ok || cancelled) return;
        const fromDb = (data.users ?? []).map(publicUserToPartner);
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
      insight: matchInsight(profile, partner),
    }))
      .filter(({ partner, insight }) => passesFilters(partner, insight, filters, complementary))
      .sort((left, right) => right.insight.score - left.insight.score);
  }, [profile, filters, complementary, directory]);

  async function sendInvite(partner: Partner) {
    setPendingInviteId(partner.id);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: partner.id }),
      });
      if (response.ok) {
        setSentInvites((current) => new Set(current).add(partner.id));
      }
    } finally {
      setPendingInviteId(null);
    }
  }

  async function generate(partner: Partner) {
    const id = requestId.current + 1;
    requestId.current = id;
    setOpen(true);
    setSession({
      partner,
      loading: true,
      error: null,
      result: null,
      accepted: false,
    });
    try {
      const payload = await requestQuest(profile, partner);
      if (requestId.current !== id) return;
      setSession({
        partner,
        loading: false,
        error: null,
        result: payload,
        accepted: false,
      });
    } catch (cause) {
      if (requestId.current !== id) return;
      setSession({
        partner,
        loading: false,
        error: cause instanceof Error ? cause.message : "Could not generate a quest.",
        result: null,
        accepted: false,
      });
    }
  }

  async function accept(quest: Quest) {
    if (!session?.result?.mission) return;
    const mission = session.result.mission;
    writeActiveWorkspace({
      ...mission,
      partnerName: session.partner.name,
      acceptedAt: new Date().toISOString(),
    });
    acceptQuest(acceptedQuest(session.partner, quest));
    setSession((current) => (current ? { ...current, accepted: true } : current));
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    router.push("/workspace");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-xl text-sm text-slate-400">
            Filter by skills and domains, then propose a match. Accepting a quest boots Mission Control with a
            Gemini-generated 72-hour sprint.
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
                  onSendInvite={() => void sendInvite(partner)}
                  invitePending={pendingInviteId === partner.id}
                  inviteSent={sentInvites.has(partner.id)}
                  onPropose={() => {
                    void generate(partner);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <QuestDialog
        viewer={profile}
        session={session}
        open={open}
        onOpenChange={setOpen}
        onRetry={() => {
          if (session) void generate(session.partner);
        }}
        onAccept={accept}
      />
    </div>
  );
}
