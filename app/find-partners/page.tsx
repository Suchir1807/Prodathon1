"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { formatUsername } from "@/lib/profile";

type PartnerUser = {
  _id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  isFollowing: boolean;
};

function SkillPills({ label, skills }: { label: string; skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] tracking-wide text-slate-500 uppercase">{label}</span>
      {skills.map((skill) => (
        <span
          key={skill}
          className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

export default function FindPartnersPage() {
  const [partners, setPartners] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const inviteRef = useRef(false);

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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-8 text-sm text-slate-400 md:px-6">
        <Loader2 className="size-4 animate-spin text-[#ccff00]" />
        Loading partners…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-destructive md:px-6">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <p className="max-w-xl text-sm text-slate-400">
        Founders who have joined CoFoundry. Send an invite to start a shared workspace.
      </p>

      {partners.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="text-sm text-slate-300">
            No other founders have joined yet. Invite some friends!
          </p>
        </div>
      ) : (
        <>
        {inviteError ? <p role="alert" className="mt-4 text-xs text-rose-400">{inviteError}</p> : null}
        <div className="mt-6 flex flex-col gap-3">
          {partners.map((partner) => {
            const name = partner.displayName.trim() || formatUsername(partner.username);
            const sent = sentIds.includes(partner._id);
            const pending = pendingId === partner._id;
            const followPending = pendingFollowId === partner._id;
            return (
              <article
                key={partner._id}
                className="glass grid gap-3 rounded-xl p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={name} className="size-9 text-[10px]" />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium text-white">{name}</h2>
                      <p className="truncate text-[11px] text-slate-500">@{partner.username}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <SkillPills label="Can teach" skills={partner.skillsHave} />
                    <SkillPills label="Wants to learn" skills={partner.skillsLearn} />
                    <SkillPills label="Domains" skills={partner.domainInterests} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || sent}
                    loading={pending}
                    onClick={() => void sendInvite(partner._id)}
                  >
                    {sent ? "Invite sent" : pending ? "Sending…" : "Send Invite"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={followPending}
                    loading={followPending}
                    onClick={() => void toggleFollow(partner._id)}
                    className={followingIds.has(partner._id)
                      ? "border-neutral-700 text-neutral-400 hover:text-neutral-200"
                      : "border-[#ccff00]/35 text-[#ccff00] hover:border-[#ccff00]/70"}
                  >
                    {followPending ? "Updating…" : followingIds.has(partner._id) ? "Following" : "Follow"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
