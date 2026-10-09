"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayName } from "@/lib/profile";
import type { Partner, Profile, Quest, QuestResponse } from "@/lib/types";

const STATUS_LINES = [
  "Connecting neural pathways...",
  "Reading both skill graphs...",
  "Drafting Mission Control board...",
  "Splitting frontend and backend tracks...",
  "Sealing the hour-36 curveball...",
];

function QuestLoading() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" aria-busy="true">
      <div className="relative size-28">
        <span className="absolute inset-0 animate-ping rounded-full border border-primary/40" />
        <span className="absolute inset-2 animate-spin rounded-full border border-primary/60 [animation-duration:3s]" />
        <span className="absolute inset-5 animate-spin rounded-full border-2 border-dashed border-violet-400/80 [animation-direction:reverse] [animation-duration:6s]" />
        <Sparkles className="absolute inset-0 m-auto size-7 text-primary" />
      </div>
      <div className="relative mt-8 h-6 w-full">
        {STATUS_LINES.map((line, index) => (
          <p
            key={line}
            className="absolute inset-x-0 font-mono text-sm text-primary opacity-0"
            style={{ animation: `quest-status 7s ${index * 1.4}s infinite` }}
          >
            {line}
          </p>
        ))}
      </div>
      <p className="mt-6 max-w-sm text-xs text-muted-foreground">
        Pairing complementary skills into a three-day build.
      </p>
    </div>
  );
}

function TaskColumn({
  eyebrow,
  name,
  focus,
  tasks,
}: {
  eyebrow: string;
  name: string;
  focus: string;
  tasks: string[];
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-background/50 p-4">
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold">{name}</h3>
      <p className="text-xs text-muted-foreground">{focus} focus</p>
      <ol className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li key={task} className="text-sm leading-5 text-foreground/90">
            {task}
          </li>
        ))}
      </ol>
    </section>
  );
}

export type QuestSession = {
  partner: Partner;
  loading: boolean;
  error: string | null;
  result: QuestResponse | null;
  accepted: boolean;
};

export function QuestDialog({
  viewer,
  session,
  open,
  onOpenChange,
  onRetry,
  onAccept,
}: {
  viewer: Profile;
  session: QuestSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onAccept: (quest: Quest) => void | Promise<void>;
}) {
  const [booting, setBooting] = useState(false);
  const quest = session?.result?.quest ?? null;
  const mission = session?.result?.mission ?? null;
  const partner = session?.partner ?? null;

  async function handleAccept() {
    if (!quest || booting || session?.accepted) return;
    setBooting(true);
    try {
      await onAccept(quest);
    } finally {
      setBooting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#10182b]/80 p-0 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader className="border-b border-white/10 px-5 py-4 pr-12">
          <DialogTitle>
            {session?.loading ? "Generating your quest" : quest ? quest.title : "Quest generator"}
          </DialogTitle>
          <DialogDescription>
            {partner
              ? `${displayName(viewer)} × ${partner.name}`
              : "Pick a partner to generate a 3-day quest."}
          </DialogDescription>
        </DialogHeader>

        {session?.loading ? <QuestLoading /> : null}

        {session && !session.loading && session.error ? (
          <div className="space-y-4 px-5 py-8">
            <p className="text-sm text-destructive">{session.error}</p>
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null}

        {session && !session.loading && quest ? (
          <div className="space-y-4 px-5 py-5">
            {session.result?.notice ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {session.result.notice}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {quest.difficulty} · {quest.timeline}
              </span>
              {quest.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
            {quest.tagline ? <p className="text-sm text-foreground/90">{quest.tagline}</p> : null}
            {quest.summary ? <p className="text-sm text-muted-foreground">{quest.summary}</p> : null}

            {mission ? (
              <p className="rounded-lg border border-[#ccff00]/25 bg-[#ccff00]/5 px-3 py-2 text-xs text-slate-200">
                <span className="font-medium text-[#ccff00]">Hour-36 curveball (classified): </span>
                {mission.plannedCurveball}
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <TaskColumn
                eyebrow="Student A"
                name={quest.studentA.name}
                focus={quest.studentA.focus}
                tasks={quest.studentA.tasks}
              />
              <TaskColumn
                eyebrow="Student B"
                name={quest.studentB.name}
                focus={quest.studentB.focus}
                tasks={quest.studentB.tasks}
              />
            </div>

            {quest.successCriteria.length > 0 ? (
              <div>
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Done when
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground/90">
                  {quest.successCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              disabled={session.accepted || booting}
              onClick={() => {
                void handleAccept();
              }}
            >
              {booting ? <Loader2 className="animate-spin" /> : session.accepted ? <Check /> : null}
              {booting
                ? "Initializing Mission Control..."
                : session.accepted
                  ? "Quest accepted"
                  : "Accept Quest"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
