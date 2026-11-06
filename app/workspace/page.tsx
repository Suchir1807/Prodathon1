"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Users } from "lucide-react";

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
        <div className="glass max-w-lg rounded-2xl border border-white/5 px-8 py-10 text-center shadow-[0_0_15px_rgba(255,255,255,0.03)]">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300">
            <Users className="size-6" />
          </span>
          <p className="mt-6 text-base leading-relaxed text-zinc-400">
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
