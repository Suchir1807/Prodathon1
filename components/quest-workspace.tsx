"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Bot, Circle, GripVertical, Rocket, Send } from "lucide-react";

import { useIsClient } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSampleMission, missionApiSnippet } from "@/lib/mission";
import { STARTER_PROFILE } from "@/lib/catalog";
import type { ActiveMissionWorkspace } from "@/lib/workspace";
import {
  getWorkspaceServerSnapshot,
  getWorkspaceSnapshot,
  readActiveWorkspace,
  subscribeWorkspace,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

type TaskOwner = "a" | "b";

type WorkspaceTask = {
  id: string;
  title: string;
  owner: TaskOwner;
  column: "todo" | "done";
};

const PANEL =
  "flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md";

const FALLBACK = buildSampleMission(STARTER_PROFILE, {
  ...STARTER_PROFILE,
  name: "Maya Chen",
  domains: ["FinTech"],
});

function workspaceFromSnapshot(snapshot: string): ActiveMissionWorkspace | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot) as ActiveMissionWorkspace;
  } catch {
    return null;
  }
}

function tasksFromMission(mission: ActiveMissionWorkspace): WorkspaceTask[] {
  const a = mission.kanbanTasksStudentA.map((title, index) => ({
    id: `a-${index}`,
    title,
    owner: "a" as const,
    column: "todo" as const,
  }));
  const b = mission.kanbanTasksStudentB.map((title, index) => ({
    id: `b-${index}`,
    title,
    owner: "b" as const,
    column: "todo" as const,
  }));
  return [...a, ...b];
}

function subscribeCountdown(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function formatRemaining(acceptedAt: string | undefined) {
  const end =
    acceptedAt !== undefined
      ? new Date(acceptedAt).getTime() + 72 * 3_600_000
      : Date.now() + 47 * 3_600_000 + 12 * 60_000 + 5_000;
  const left = Math.max(0, end - Date.now());
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function highlightJson(source: string) {
  const re = /"(?:\\.|[^"\\])*"|\b\d+\.?\d*\b|[{}\[\]:,]/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`gap-${lastIndex}`}>{source.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    let className = "text-slate-400";
    if (token.startsWith('"')) {
      const after = source.slice(match.index + token.length).match(/^\s*:/);
      className = after ? "text-sky-300" : "text-lime-400";
    } else if (/^[{}[\]]$/.test(token)) {
      className = "text-white";
    } else if (/^[:,]$/.test(token)) {
      className = "text-slate-500";
    } else if (/^\d/.test(token)) {
      className = "text-amber-300/90";
    }
    nodes.push(
      <span key={`tok-${match.index}`} className={className}>
        {token}
      </span>,
    );
    lastIndex = match.index + token.length;
  }
  if (lastIndex < source.length) {
    nodes.push(<span key="tail">{source.slice(lastIndex)}</span>);
  }
  return nodes;
}

function taskCardStyles(owner: TaskOwner) {
  return owner === "a"
    ? "border-l-4 border-lime-400 bg-slate-900/55 hover:bg-slate-800/70"
    : "border-l-4 border-cyan-400 bg-slate-900/55 hover:bg-slate-800/70";
}

function ownerLabel(owner: TaskOwner) {
  return owner === "a" ? "Student A · Frontend" : "Student B · Backend";
}

export function QuestWorkspace() {
  const isClient = useIsClient();
  const snapshot = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getWorkspaceServerSnapshot,
  );
  const mission = useMemo(() => {
    if (!isClient) return null;
    return workspaceFromSnapshot(snapshot) ?? readActiveWorkspace();
  }, [isClient, snapshot]);

  const activeMission = useMemo((): ActiveMissionWorkspace => {
    if (mission) return mission;
    return {
      ...FALLBACK,
      partnerName: "Maya Chen",
      acceptedAt: new Date().toISOString(),
    };
  }, [mission]);

  const remaining = useSyncExternalStore(
    subscribeCountdown,
    () => formatRemaining(activeMission.acceptedAt),
    () => "72:00:00",
  );

  const [draft, setDraft] = useState("");
  const tasks = useMemo(() => tasksFromMission(activeMission), [activeMission]);
  const apiSnippet = useMemo(() => missionApiSnippet(activeMission), [activeMission]);
  const mentorLine = `Curveball queued for hour 36: ${activeMission.plannedCurveball}`;

  const todo = tasks.filter((t) => t.column === "todo");
  const done = tasks.filter((t) => t.column === "done");

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/40 px-4 py-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-semibold text-white md:text-lg">
            {activeMission.questTitle}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/40 bg-lime-400/10 px-2 py-0.5 text-[11px] font-medium text-lime-400">
            <Circle className="size-2 fill-lime-400 text-lime-400 shadow-[0_0_8px_#a3e635]" />
            Active
          </span>
        </div>
        <div className="order-3 flex w-full justify-center md:order-none md:w-auto">
          <div className="inline-flex flex-col items-center rounded-full border border-lime-400/30 bg-lime-400/10 px-6 py-2 shadow-[0_0_28px_rgba(163,230,53,0.12)]">
            <p className="text-[10px] tracking-[0.2em] text-slate-500 uppercase">Sprint clock</p>
            <p className="font-mono text-2xl font-semibold tracking-tight text-lime-400 tabular-nums md:text-3xl">
              {remaining}
            </p>
            <p className="text-[10px] text-slate-500">remaining</p>
          </div>
        </div>
        <Button
          type="button"
          className="h-9 border-transparent bg-[#ccff00] px-4 text-sm font-semibold text-[#0a0f1c] hover:border-transparent hover:bg-[#d6ff4a] hover:text-[#0a0f1c] hover:shadow-[0_0_16px_rgba(204,255,0,0.5)]"
        >
          <Rocket />
          Ship Project
        </Button>
      </header>

      <div className="scrollbar-hide grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-3 md:overflow-hidden md:p-4 lg:gap-4">
        <section className={cn(PANEL, "min-h-[320px] md:min-h-0")}>
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-medium text-white">Mission board</h2>
            <p className="text-[11px] text-slate-500">
              Partner: {activeMission.partnerName} · drag tasks when you ship
            </p>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-3">
            <KanbanColumn title="To Do" count={todo.length} tasks={todo} />
            <KanbanColumn title="Done" count={done.length} tasks={done} accent="done" />
          </div>
        </section>

        <section className={cn(PANEL, "min-h-[280px] md:min-h-0")}>
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-medium text-white">Agreed API Data Structure</h2>
            <p className="line-clamp-2 text-[11px] text-slate-500">{activeMission.apiContractHint}</p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-[#050a14]/95 shadow-inner">
              <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-red-500/90" />
                  <span className="size-2.5 rounded-full bg-amber-400/90" />
                  <span className="size-2.5 rounded-full bg-emerald-500/90" />
                </div>
                <span className="truncate font-mono text-[10px] text-slate-500">contract.json — read-only</span>
              </div>
              <pre className="scrollbar-hide min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                <code>{highlightJson(apiSnippet)}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className={cn(PANEL, "min-h-[320px] border-lime-400/15 md:min-h-0")}>
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-medium text-white">AI Co-Pilot</h2>
            <p className="text-[11px] text-slate-500">Third co-founder on standby</p>
          </div>
          <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="flex gap-3 rounded-xl border border-lime-400/25 bg-gradient-to-r from-lime-900/20 to-transparent p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-lime-400/50 bg-lime-400/10 text-lime-400 shadow-[0_0_14px_rgba(163,230,53,0.45)]">
                <Bot className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-lime-400 uppercase">AI Mentor</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{mentorLine}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
              <p className="text-[10px] text-slate-500">Mission brief</p>
              <p className="mt-1 leading-relaxed">{activeMission.apiContractHint}</p>
            </div>
          </div>
          <form
            className="border-t border-slate-800 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              setDraft("");
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask the co-pilot or @mention your partner"
                aria-label="Message AI co-pilot"
                className="h-8 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="icon-sm" className="rounded-full" disabled={!draft.trim()} aria-label="Send">
                <Send className="size-3.5" />
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  tasks,
  accent,
}: {
  title: string;
  count: number;
  tasks: WorkspaceTask[];
  accent?: "done";
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950/30 p-2",
        accent === "done" && "border-lime-400/20",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{title}</span>
        <span className="text-[10px] text-slate-600">{count}</span>
      </div>
      <ul className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={cn(
              "cursor-grab rounded-lg border border-slate-800/80 p-2.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:cursor-grabbing",
              taskCardStyles(task.owner),
            )}
          >
            <div className="flex items-start gap-2">
              <GripVertical className="mt-0.5 size-3.5 shrink-0 text-slate-600" />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[10px] font-medium",
                    task.owner === "a" ? "text-lime-400/90" : "text-cyan-400/90",
                  )}
                >
                  {ownerLabel(task.owner)}
                </p>
                <p className="mt-0.5 text-xs text-white">{task.title}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
