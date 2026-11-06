"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Check, Circle, MessageSquare, Rocket, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

import { useIsClient } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import { missionApiSnippet } from "@/lib/mission";
import type { ActiveMissionWorkspace } from "@/lib/workspace";
import {
  getWorkspaceServerSnapshot,
  getWorkspaceSnapshot,
  readActiveWorkspace,
  subscribeWorkspace,
  writeActiveWorkspace,
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
  "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1710]/85 shadow-[0_16px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl";

function workspaceFromSnapshot(snapshot: string): ActiveMissionWorkspace | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot) as ActiveMissionWorkspace;
  } catch {
    return null;
  }
}

function tasksFromMission(mission: ActiveMissionWorkspace): WorkspaceTask[] {
  const completed = new Set(mission.completedTaskIds ?? []);
  const a = mission.kanbanTasksStudentA.map((title, index) => ({
    id: `a-${index}`,
    title,
    owner: "a" as const,
    column: (completed.has(`a-${index}`) ? "done" : "todo") as "todo" | "done",
  }));
  const b = mission.kanbanTasksStudentB.map((title, index) => ({
    id: `b-${index}`,
    title,
    owner: "b" as const,
    column: (completed.has(`b-${index}`) ? "done" : "todo") as "todo" | "done",
  }));
  return [...a, ...b];
}

function subscribeCountdown(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function formatRemaining(acceptedAt: string | undefined) {
  if (!acceptedAt) return "00:00:00";
  const end = new Date(acceptedAt).getTime() + 72 * 3_600_000;
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
      className = after ? "text-sky-300" : "text-emerald-300";
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
    ? "border-l-2 border-l-emerald-300/70 bg-white/[0.035]"
    : "border-l-2 border-l-sky-300/70 bg-white/[0.035]";
}

function ownerLabel(owner: TaskOwner) {
  return owner === "a" ? "Student A · Frontend" : "Student B · Backend";
}

function getQuestDayIndex(acceptedAt: string | undefined) {
  if (!acceptedAt) return 0;
  const acceptedTime = Date.parse(acceptedAt);
  if (!Number.isFinite(acceptedTime)) return 0;
  const elapsedDays = Math.floor(Math.max(0, Date.now() - acceptedTime) / 86_400_000);
  return Math.min(2, elapsedDays);
}

function getQuestProgress(acceptedAt: string | undefined) {
  if (!acceptedAt) return 0;
  const acceptedTime = Date.parse(acceptedAt);
  if (!Number.isFinite(acceptedTime)) return 0;
  return Math.min(100, Math.max(0, ((Date.now() - acceptedTime) / (72 * 3_600_000)) * 100));
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

  const remaining = useSyncExternalStore(
    subscribeCountdown,
    () => formatRemaining(mission?.acceptedAt),
    () => "00:00:00",
  );

  const tasks = useMemo(() => (mission ? tasksFromMission(mission) : []), [mission]);
  const apiSnippet = useMemo(() => (mission ? missionApiSnippet(mission) : ""), [mission]);
  const mentorLine = mission?.plannedCurveball ?? "";

  if (!mission) return null;

  const activeMission = mission;

  const todo = tasks.filter((t) => t.column === "todo");
  const done = tasks.filter((t) => t.column === "done");
  const allTasksDone = tasks.length > 0 && done.length === tasks.length;
  const currentDay = getQuestDayIndex(activeMission.acceptedAt);
  const progress = getQuestProgress(activeMission.acceptedAt);

  function toggleTask(taskId: string) {
    const completed = new Set(activeMission.completedTaskIds ?? []);
    const isComplete = completed.has(taskId);
    if (isComplete) completed.delete(taskId);
    else completed.add(taskId);
    writeActiveWorkspace({ ...activeMission, completedTaskIds: [...completed] });
    if (!isComplete) {
      toast.success(
        completed.size === tasks.length && tasks.length > 0
          ? "Every quest task is complete"
          : "Task marked complete",
        {
          description:
            completed.size === tasks.length && tasks.length > 0
              ? "Your build is ready for its showcase."
              : "A little progress, made together.",
        },
      );
    }
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#07110c] text-white">
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#07110c]/90 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">
              72-hour collaboration · with {activeMission.partnerName}
            </p>
            <h1 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight text-white md:text-xl">
              {activeMission.questTitle}
            </h1>
          </div>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-medium text-emerald-200">
            <Circle className="size-1.5 fill-emerald-300 text-emerald-300" />
            Live
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="rounded-xl border border-signal/20 bg-signal/[0.06] px-3 py-2 text-right sm:px-4">
            <p className="text-[9px] font-medium tracking-[0.16em] text-slate-400 uppercase">Time left</p>
            <p className="font-mono text-lg font-semibold tracking-tight text-signal tabular-nums sm:text-xl">
              {remaining}
            </p>
          </div>
          <Button asChild className="h-10 shrink-0 px-3.5 text-xs font-semibold sm:px-4 sm:text-sm">
            <Link href="/showcase">
              <Rocket />
              <span className="hidden sm:inline">Build showcase</span>
              <span className="sm:hidden">Showcase</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b border-white/8 bg-[#0a160f]/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="hidden min-w-32 sm:block">
            <p className="text-[10px] font-medium tracking-wide text-emerald-200/70 uppercase">Quest progress</p>
            <p className="mt-0.5 text-xs text-slate-400">Day {currentDay + 1} of 3</p>
          </div>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10 sm:mx-5" role="progressbar" aria-label="Three-day quest progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
          <ol className="flex shrink-0 items-center gap-2 sm:gap-5">
            {(["Align", "Build", "Showcase"] as const).map((step, index) => {
              const complete = index < currentDay;
              const current = index === currentDay;
              return (
                <li key={step} className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`grid size-6 place-items-center rounded-full border text-[10px] ${complete ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : current ? "border-signal/40 bg-signal/10 text-signal" : "border-white/10 text-slate-500"}`}>
                    {complete ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className={`hidden text-[11px] sm:inline ${current ? "font-medium text-white" : complete ? "text-emerald-100/70" : "text-slate-500"}`}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {allTasksDone ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 md:mx-4"
          role="status"
        >
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-100">
            <Check className="size-4" />
            Your quest board is complete. Capture the story you built together.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/showcase">Create a showcase <Sparkles /></Link>
          </Button>
        </motion.div>
      ) : null}

      <div className="scrollbar-hide grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-3 md:overflow-hidden md:p-4 lg:gap-4">
        <section className={cn(PANEL, "min-h-[320px] md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">01 · Shared plan</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Mission board</h2>
            <p className="text-[11px] text-slate-500">A first-pass list to help you get moving.</p>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-3">
            <KanbanColumn title="To Do" count={todo.length} tasks={todo} onToggle={toggleTask} />
            <KanbanColumn title="Done" count={done.length} tasks={done} accent="done" onToggle={toggleTask} />
          </div>
        </section>

        <section className={cn(PANEL, "min-h-[280px] md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-sky-300/70 uppercase">02 · Shared contract</p>
            <h2 className="mt-1 text-sm font-semibold text-white">API data structure</h2>
            <p className="line-clamp-2 text-[11px] text-slate-500">{activeMission.apiContractHint}</p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#050a14]/95 shadow-inner">
              <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2 rounded-full bg-rose-400/80" />
                  <span className="size-2 rounded-full bg-amber-300/80" />
                  <span className="size-2 rounded-full bg-emerald-300/80" />
                </div>
                <span className="truncate font-mono text-[10px] text-slate-500">contract.json — read-only</span>
              </div>
              <pre className="scrollbar-hide min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                <code>{highlightJson(apiSnippet)}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className={cn(PANEL, "min-h-[320px] border-emerald-300/15 md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-signal/70 uppercase">03 · Get unstuck</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Mission guide</h2>
            <p className="text-[11px] text-slate-500">A prompt to get your next conversation moving</p>
          </div>
          <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="flex gap-3 rounded-xl border border-signal/20 bg-gradient-to-r from-emerald-900/25 to-transparent p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-signal/30 bg-signal/[0.08] text-signal">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-signal uppercase">Hour-36 curveball</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{mentorLine}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
              <p className="text-[10px] text-slate-500">Mission brief</p>
              <p className="mt-1 leading-relaxed">{activeMission.apiContractHint}</p>
            </div>
          </div>
          <div className="border-t border-white/8 p-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/messages">
                <MessageSquare />
                Open partner messages
              </Link>
            </Button>
          </div>
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
  onToggle,
}: {
  title: string;
  count: number;
  tasks: WorkspaceTask[];
  accent?: "done";
  onToggle: (taskId: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-white/[0.07] bg-black/15 p-2",
        accent === "done" && "border-emerald-300/15",
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
            className={cn("rounded-lg border border-white/[0.06] p-2.5", taskCardStyles(task.owner))}
          >
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              aria-pressed={task.column === "done"}
              aria-label={`${task.column === "done" ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
              className="flex w-full items-start gap-2 text-left focus-visible:rounded-md"
            >
              <span className={cn("mt-0.5 shrink-0", task.column === "done" ? "text-emerald-200" : "text-slate-500")}>
                {task.column === "done" ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[10px] font-medium",
                    task.owner === "a" ? "text-emerald-200/90" : "text-sky-200/90",
                  )}
                >
                  {ownerLabel(task.owner)}
                </span>
                <span className={cn("mt-0.5 block text-xs text-white", task.column === "done" && "text-slate-400 line-through")}>
                  {task.title}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
