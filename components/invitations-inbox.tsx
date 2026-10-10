"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/profile";
import { writeActiveWorkspace } from "@/lib/workspace";
import { buildSampleMission } from "@/lib/mission";
import { cn } from "@/lib/utils";

type InviteSender = {
  id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
};

type PendingInvite = {
  id: string;
  status: string;
  sender: InviteSender;
};

export function InvitationsInbox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/invitations", { cache: "no-store" });
      const data = (await response.json()) as { invitations?: PendingInvite[] };
      if (response.ok) {
        setInvites(data.invitations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function respond(invitationId: string, status: "accepted" | "declined") {
    setActingId(invitationId);
    try {
      const response = await fetch("/api/invitations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, status }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        partner?: InviteSender;
        error?: string;
      };

      if (!response.ok) return;

      if (status === "accepted" && data.partner) {
        const partnerProfile = {
          name: data.partner.displayName || data.partner.username,
          canTeach: data.partner.skillsHave,
          wantsToLearn: data.partner.skillsLearn,
          domains: data.partner.domainInterests,
        };
        const mission = buildSampleMission(
          { name: "", canTeach: [], wantsToLearn: [], domains: [] },
          partnerProfile,
        );
        writeActiveWorkspace({
          ...mission,
          partnerName: partnerProfile.name,
          acceptedAt: new Date().toISOString(),
        });
        setOpen(false);
        router.push("/workspace");
        return;
      }

      await load();
    } finally {
      setActingId(null);
    }
  }

  const count = invites.length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Invitation inbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/5 hover:text-[#ccff00]"
      >
        <Inbox className="size-4" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#ccff00] text-[9px] font-bold text-[#0a0f1c]">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close inbox"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#0e1526]/95 p-3 shadow-xl backdrop-blur-xl">
            <p className="px-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              Invitations
            </p>
            {loading ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : invites.length === 0 ? (
              <p className="px-1 py-6 text-sm text-slate-500">No pending invites.</p>
            ) : (
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {invites.map((invite) => {
                  const senderProfile = {
                    name: invite.sender.displayName,
                    canTeach: invite.sender.skillsHave,
                    wantsToLearn: invite.sender.skillsLearn,
                    domains: invite.sender.domainInterests,
                  };
                  const label = displayName(senderProfile, invite.sender.username);
                  const busy = actingId === invite.id;
                  return (
                    <li
                      key={invite.id}
                      className="rounded-lg border border-white/8 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar name={label} className="size-8 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{label}</p>
                          <p className="text-[11px] text-slate-500">Partner invite</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 flex-1"
                          disabled={busy}
                          onClick={() => void respond(invite.id, "accepted")}
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn("h-7 flex-1", busy && "opacity-50")}
                          disabled={busy}
                          onClick={() => void respond(invite.id, "declined")}
                        >
                          Decline
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
