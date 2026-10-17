"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Radar, Users } from "lucide-react";

import { QuestWorkspace } from "@/components/quest-workspace";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceServerSnapshot,
  getWorkspaceSnapshot,
  readActiveWorkspace,
  subscribeWorkspace,
} from "@/lib/workspace";

export default function WorkspacePage() {
  const snapshot = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getWorkspaceServerSnapshot,
  );
  const isMatched = Boolean(snapshot && readActiveWorkspace());

  if (!isMatched) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-16">
        <div className="glass max-w-lg rounded-2xl border border-white/10 bg-[#10182b]/80 px-8 py-10 text-center shadow-[0_0_48px_rgba(0,0,0,0.35)]">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/5 text-[#ccff00]">
            <Radar className="size-7" />
          </span>
          <p className="mt-6 text-base leading-relaxed text-slate-300">
            Your workspace is quiet. Invite a partner to start.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild className="h-10 px-5">
              <Link href="/find-partners">
                <Users />
                Find a partner
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <QuestWorkspace />;
}
