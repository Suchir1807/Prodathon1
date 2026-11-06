"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  Rocket,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuestListItem = {
  id: string;
  title: string;
  brief: string;
  status: string;
  startedAt: string | null;
  deadline: string | null;
  members: Array<{ id: string; username: string; displayName: string; role: "A" | "B"; acceptedAt: string | null }>;
  taskCounts: Record<string, number>;
};

type QuestDetail = {
  quest: {
    id: string;
    title: string;
    brief: string;
    status: string;
    generationSource: "gemini" | "sample";
    startedAt: string | null;
    deadline: string | null;
    myRole: "A" | "B" | null;
    acceptedByMe: boolean;
    partnerAccepted: boolean;
    members: Array<{ userId: string; username: string; displayName: string; role: "A" | "B"; acceptedAt: string | null }>;
    skillsUsed: string[];
    roles: { A: string; B: string };
    curveball: { unlockHour: number; unlocked: boolean; text?: string };
    stretchGoal: string;
  };
  tasks: QuestTask[];
  spec: { content: string; revision: number; editor: { username: string; displayName: string } | null; updatedAt: string; history: Array<{ revision: number; content: string; editedAt: string; editor?: { username: string; displayName: string } | null }> } | null;
  submission: { id: string; submittedBy: string; repositoryUrl: string; demoUrl: string; writeUp: string; status: string } | null;
  review: { rating: number; feedback: string; decision: "approved" | "changes_requested" } | null;
  showcaseId: string | null;
};

type QuestTask = {
  id: string;
  title: string;
  role: "A" | "B" | "shared";
  assignee: { id: string; username: string; displayName: string } | null;
  status: "todo" | "doing" | "done";
  order: number;
  priority: number;
  completedAt: string | null;
};

type QuestMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

const PANEL = "overflow-hidden rounded-2xl border border-white/10 bg-[#0b1710]/85 shadow-[0_16px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl";
const STATUSES: QuestTask["status"][] = ["todo", "doing", "done"];
const STATUS_LABELS: Record<QuestTask["status"], string> = { todo: "To do", doing: "In progress", done: "Done" };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result as T;
}

function remaining(deadline: string | null, now: number) {
  if (!deadline) return "Waiting for both";
  const left = Math.max(0, Date.parse(deadline) - now);
  if (!Number.isFinite(left) || left === 0) return "Time's up";
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDay(startedAt: string | null, now: number) {
  if (!startedAt) return 1;
  return Math.min(3, Math.floor(Math.max(0, now - Date.parse(startedAt)) / 86_400_000) + 1);
}

function displayMember(member: QuestDetail["quest"]["members"][number]) {
  return member.displayName.trim() || member.username;
}

export function RealQuestWorkspace({ initialQuestId }: { initialQuestId?: string }) {
  const [quests, setQuests] = useState<QuestListItem[]>([]);
  const [selectedId, setSelectedId] = useState(initialQuestId ?? "");
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [messages, setMessages] = useState<QuestMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRole, setTaskRole] = useState<"A" | "B" | "shared">("shared");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEditDraft, setTaskEditDraft] = useState("");
  const [specDraft, setSpecDraft] = useState("");
  const [specDirty, setSpecDirty] = useState(false);
  const [specSaving, setSpecSaving] = useState(false);
  const [specConflict, setSpecConflict] = useState(false);
  const [chatText, setChatText] = useState("");
  const [blocker, setBlocker] = useState("");
  const [hint, setHint] = useState("");
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [writeUp, setWriteUp] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const specDirtyRef = useRef(false);
  const detailRef = useRef<QuestDetail | null>(null);

  const loadQuests = useCallback(async () => {
    const data = await requestJson<{ quests: QuestListItem[] }>("/api/quests");
    setQuests(data.quests);
    setSelectedId((current) => {
      if (current && data.quests.some((quest) => quest.id === current)) return current;
      if (initialQuestId && data.quests.some((quest) => quest.id === initialQuestId)) return initialQuestId;
      return data.quests[0]?.id ?? "";
    });
  }, [initialQuestId]);

  const loadDetail = useCallback(async (questId: string) => {
    const data = await requestJson<QuestDetail>(`/api/quests/${encodeURIComponent(questId)}`);
    setDetail(data);
    if (!specDirtyRef.current) setSpecDraft(data.spec?.content ?? "");
    const previous = detailRef.current;
    if (data.spec && specDirtyRef.current && previous?.spec && data.spec.revision !== previous.spec.revision) {
      setSpecConflict(true);
    }
    return data;
  }, []);

  const loadMessages = useCallback(async (questId: string) => {
    const data = await requestJson<{ messages: QuestMessage[] }>(`/api/quests/${encodeURIComponent(questId)}/messages`);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    let active = true;
    requestJson<{ quests: QuestListItem[] }>("/api/quests")
      .then((data) => {
        if (!active) return;
        setQuests(data.quests);
        setSelectedId((current) => current && data.quests.some((quest) => quest.id === current)
          ? current
          : initialQuestId && data.quests.some((quest) => quest.id === initialQuestId)
            ? initialQuestId
            : data.quests[0]?.id ?? "");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load quests.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialQuestId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [fresh] = await Promise.all([loadDetail(selectedId), loadMessages(selectedId)]);
        if (!active) return;
        setError("");
        if (fresh.quest.status !== detailRef.current?.quest.status) void loadQuests();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to refresh this quest.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 4000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [selectedId, loadDetail, loadMessages, loadQuests]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    specDirtyRef.current = specDirty;
  }, [specDirty]);

  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  useEffect(() => {
    if (!detail?.spec || !specDirty || specConflict) return;
    const timer = window.setTimeout(async () => {
      setSpecSaving(true);
      try {
        const saved = await requestJson<{ content: string; revision: number; updatedAt: string }>(
          `/api/quests/${detail.quest.id}/spec`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: specDraft, expectedRevision: detail.spec!.revision }),
          },
        );
        setDetail((current) => current ? { ...current, spec: { ...current.spec!, ...saved } } : current);
        setSpecDirty(false);
        specDirtyRef.current = false;
      } catch (cause) {
        if (cause instanceof Error && cause.message.includes("another session")) setSpecConflict(true);
        else toast.error(cause instanceof Error ? cause.message : "Unable to save the shared spec.");
      } finally {
        setSpecSaving(false);
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [detail?.quest.id, detail?.spec, specDraft, specDirty, specConflict]);

  async function acceptQuest() {
    if (!detail) return;
    setBusy("accept");
    try {
      const result = await requestJson<{ quest: QuestDetail["quest"] }>(`/api/quests/${detail.quest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, idempotencyKey: crypto.randomUUID() }),
      });
      setDetail((current) => current ? { ...current, quest: result.quest } : current);
      await loadQuests();
      toast.success(result.quest.status === "active" ? "The 72-hour quest is live." : "You’re in. Waiting for your partner.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to accept quest.");
    } finally {
      setBusy("");
    }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !taskTitle.trim()) return;
    setBusy("task-create");
    try {
      await requestJson<{ task: QuestTask & { assigneeId?: string | null } }>(
        `/api/quests/${detail.quest.id}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: taskTitle.trim(), role: taskRole, priority: 3, idempotencyKey: crypto.randomUUID() }),
        },
      );
      setTaskTitle("");
      await loadDetail(detail.quest.id);
      toast.success("Task added to the shared board.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to add task.");
    } finally {
      setBusy("");
    }
  }

  async function updateTask(task: QuestTask, patch: Record<string, unknown>) {
    if (!detail) return;
    const previous = detail;
    setDetail({ ...detail, tasks: detail.tasks.map((item) => item.id === task.id ? { ...item, ...patch } as QuestTask : item) });
    try {
      await requestJson(`/api/quests/${detail.quest.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, idempotencyKey: crypto.randomUUID() }),
      });
      if (patch.status === "done") toast.success("Nice progress. Your partner can see it now.");
    } catch (cause) {
      setDetail(previous);
      toast.error(cause instanceof Error ? cause.message : "Task update failed.");
    }
  }

  async function deleteTask(task: QuestTask) {
    if (!detail) return;
    const previous = detail;
    setDetail({ ...detail, tasks: detail.tasks.filter((item) => item.id !== task.id) });
    try {
      await requestJson(`/api/quests/${detail.quest.id}/tasks/${task.id}`, { method: "DELETE" });
    } catch (cause) {
      setDetail(previous);
      toast.error(cause instanceof Error ? cause.message : "Unable to delete task.");
    }
  }

  async function reorderTask(task: QuestTask, direction: -1 | 1) {
    if (!detail) return;
    const ordered = [...detail.tasks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((item) => item.id === task.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const next = ordered.map((item, order) => ({ ...item, order }));
    const previous = detail;
    setDetail({ ...detail, tasks: next });
    try {
      await requestJson(`/api/quests/${detail.quest.id}/tasks/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: next.map((item) => item.id) }),
      });
    } catch (cause) {
      setDetail(previous);
      toast.error(cause instanceof Error ? cause.message : "Unable to reorder tasks.");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !chatText.trim()) return;
    const content = chatText.trim();
    setChatText("");
    try {
      await requestJson(`/api/quests/${detail.quest.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, idempotencyKey: crypto.randomUUID() }),
      });
      await loadMessages(detail.quest.id);
    } catch (cause) {
      setChatText(content);
      toast.error(cause instanceof Error ? cause.message : "Unable to send message.");
    }
  }

  async function getHint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !blocker.trim()) return;
    setBusy("hint");
    setHint("");
    try {
      const result = await requestJson<{ hint: string }>(`/api/quests/${detail.quest.id}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocker }),
      });
      setHint(result.hint);
      setBlocker("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to get a hint.");
    } finally {
      setBusy("");
    }
  }

  async function submitShowcase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setBusy("submission");
    try {
      await requestJson(`/api/quests/${detail.quest.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl, demoUrl, writeUp, idempotencyKey: crypto.randomUUID() }),
      });
      setSubmissionOpen(false);
      await loadDetail(detail.quest.id);
      await loadQuests();
      toast.success("Showcase submitted to your partner for review.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to submit showcase.");
    } finally {
      setBusy("");
    }
  }

  async function submitReview(decision: "approved" | "changes_requested") {
    if (!detail) return;
    setBusy("review");
    try {
      await requestJson(`/api/quests/${detail.quest.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(reviewRating), feedback: reviewFeedback, decision }),
      });
      await loadDetail(detail.quest.id);
      await loadQuests();
      toast.success(decision === "approved" ? "Quest complete. Verified skill badges earned." : "Feedback sent. Your partner can keep building.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to submit review.");
    } finally {
      setBusy("");
    }
  }

  const currentUserId = detail?.quest.members.find((member) => member.role === detail.quest.myRole)?.userId ?? "";
  const partner = detail?.quest.members.find((member) => member.userId !== currentUserId);
  const allDone = Boolean(detail?.tasks.length && detail.tasks.every((task) => task.status === "done"));
  const needsResubmission = detail?.quest.status === "changes_requested";
  const doneCount = detail?.tasks.filter((task) => task.status === "done").length ?? 0;
  const progress = detail?.tasks.length ? Math.round((doneCount / detail.tasks.length) * 100) : 0;
  const isExpired = Boolean(detail?.quest.deadline && Date.parse(detail.quest.deadline) <= now);
  const day = formatDay(detail?.quest.startedAt ?? null, now);
  const canEdit = detail ? ["active", "changes_requested"].includes(detail.quest.status) && !isExpired : false;
  const groupedTasks = useMemo(() => Object.fromEntries(STATUSES.map((status) => [
    status,
    detail?.tasks.filter((task) => task.status === status).sort((a, b) => a.order - b.order) ?? [],
  ])) as Record<QuestTask["status"], QuestTask[]>, [detail?.tasks]);

  if (loading) {
    return <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#07110c] text-sm text-slate-400"><LoaderCircle className="mr-3 size-4 animate-spin text-emerald-300" />Loading your build rooms…</main>;
  }

  if (!quests.length) {
    return (
      <main className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden bg-[#07110c] px-5 py-12 text-white">
        <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center shadow-2xl sm:p-12">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"><Sparkles className="size-5" /></span>
          <p className="mt-5 text-[10px] font-semibold tracking-[0.18em] text-emerald-200/70 uppercase">The build room</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold">Your next build starts with a good match.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Send a build request from Find Partners. When your match accepts, your shared quest will appear here.</p>
          {error ? <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <Button asChild className="mt-6"><Link href="/find-partners">Find a collaborator <ArrowUpRight /></Link></Button>
        </div>
      </main>
    );
  }

  if (!detail || detail.quest.id !== selectedId) {
    return <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#07110c] text-sm text-slate-400">{error || "Opening your quest…"}</main>;
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#07110c] text-white">
      {error ? <p role="alert" className="z-20 border-b border-rose-300/20 bg-rose-400/10 px-4 py-2 text-center text-xs text-rose-200">{error}</p> : null}
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#07110c]/90 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"><Sparkles className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">
              {partner ? `With ${displayMember(partner)}` : "Your shared quest"} · {detail.quest.status.replaceAll("_", " ")}
            </p>
            <h1 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight text-white md:text-xl">{detail.quest.title}</h1>
            <p className="mt-1 text-[11px] text-slate-500">{detail.quest.members.map((member) => `${displayMember(member)} · ${detail.quest.roles[member.role]}`).join("  /  ")}</p>
            {detail.quest.generationSource === "sample" ? <p className="mt-1 text-[10px] text-amber-200/75">Starter quest template · AI generation was unavailable</p> : null}
          </div>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-medium capitalize text-emerald-200">
            <Circle className="size-1.5 fill-emerald-300 text-emerald-300" />{detail.quest.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          {detail.quest.status === "pending" && !detail.quest.acceptedByMe ? (
            <Button className="h-10" loading={busy === "accept"} disabled={Boolean(busy)} onClick={() => void acceptQuest()}>
              Accept quest
            </Button>
          ) : detail.quest.status === "pending" ? (
            <span className="text-xs text-amber-200">Waiting for your partner to accept</span>
          ) : null}
          {detail.quest.status === "active" || detail.quest.status === "changes_requested" ? (
            <div className="rounded-xl border border-signal/20 bg-signal/[0.06] px-3 py-2 text-right sm:px-4">
              <p className="text-[9px] font-medium tracking-[0.16em] text-slate-400 uppercase">Time left · day {day} of 3</p>
              <p className={cn("font-mono text-lg font-semibold tracking-tight tabular-nums sm:text-xl", isExpired ? "text-rose-300" : "text-signal")}>
                {remaining(detail.quest.deadline, now)}
              </p>
            </div>
          ) : null}
          {detail.showcaseId ? <Button asChild className="h-10 shrink-0 px-3.5 text-xs"><Link href={`/showcase/${detail.showcaseId}`}>View showcase <Rocket /></Link></Button> : null}
        </div>
      </header>

      {quests.length > 1 ? (
        <nav aria-label="Your quests" className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/8 bg-black/10 px-4 py-2.5">
          {quests.map((quest) => (
            <button key={quest.id} type="button" onClick={() => setSelectedId(quest.id)} className={cn("max-w-56 shrink-0 truncate rounded-lg border px-3 py-1.5 text-xs", quest.id === selectedId ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100" : "border-white/10 text-slate-400 hover:text-white")}>{quest.title}</button>
          ))}
        </nav>
      ) : null}

      <div className="shrink-0 border-b border-white/8 bg-[#0a160f]/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="hidden min-w-32 sm:block">
            <p className="text-[10px] font-medium tracking-wide text-emerald-200/70 uppercase">Build progress</p>
            <p className="mt-0.5 text-xs text-slate-400">{doneCount} of {detail.tasks.length} tasks complete</p>
          </div>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10 sm:mx-5" role="progressbar" aria-label="Quest task completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
          <ol className="flex shrink-0 items-center gap-2 sm:gap-5">
            {(["Align", "Build", "Showcase"] as const).map((step, index) => {
              const complete = index === 0 ? detail.quest.members.every((member) => member.acceptedAt) && Boolean(detail.spec && detail.spec.revision > 1) : index === 1 ? allDone : Boolean(detail.submission);
              const current = !complete && (index === 0 || (index === 1 && detail.quest.status === "active") || (index === 2 && allDone));
              return <li key={step} className="flex items-center gap-1.5 sm:gap-2"><span className={cn("grid size-6 place-items-center rounded-full border text-[10px]", complete ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : current ? "border-signal/40 bg-signal/10 text-signal" : "border-white/10 text-slate-500")}>{complete ? <Check className="size-3" /> : index + 1}</span><span className={cn("hidden text-[11px] sm:inline", current ? "font-medium text-white" : complete ? "text-emerald-100/70" : "text-slate-500")}>{step}</span></li>;
            })}
          </ol>
        </div>
      </div>

      {allDone && (!detail.submission || needsResubmission) ? (
        <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 md:mx-4">
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-100"><Check className="size-4" />Every task is done. Share the work with your partner for review.</p>
          <Button size="sm" onClick={() => setSubmissionOpen(true)} disabled={!canEdit}>Build showcase <Rocket /></Button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-3 md:overflow-hidden md:p-4 lg:gap-4">
        <section className={cn(PANEL, "flex min-h-[400px] flex-col md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">01 · Shared plan</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Mission board <span className="text-slate-500">· {detail.tasks.length}</span></h2>
            <p className="text-[11px] text-slate-500">Move work forward together. Changes sync every few seconds.</p>
          </div>
          <form onSubmit={(event) => void createTask(event)} className="flex gap-2 border-b border-white/[0.07] p-3">
            <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add a task…" aria-label="New task title" maxLength={160} disabled={!canEdit} />
            <select aria-label="Task owner" value={taskRole} onChange={(event) => setTaskRole(event.target.value as typeof taskRole)} className="max-w-24 rounded-md border border-white/10 bg-slate-950 px-2 text-xs text-slate-300" disabled={!canEdit}><option value="shared">Shared</option><option value="A">Builder A</option><option value="B">Builder B</option></select>
            <Button type="submit" size="icon" aria-label="Add task" disabled={!canEdit || !taskTitle.trim() || busy === "task-create"} loading={busy === "task-create"}><Plus /></Button>
          </form>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-auto p-2 sm:gap-2 sm:p-3">
            {STATUSES.map((status) => (
              <div key={status} className="flex min-w-0 flex-col rounded-xl border border-white/[0.07] bg-black/15 p-1.5 sm:p-2">
                <div className="mb-2 flex items-center justify-between gap-1 px-0.5">
                  <span className="truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">{STATUS_LABELS[status]}</span>
                  <span className="text-[10px] text-slate-600">{groupedTasks[status].length}</span>
                </div>
                <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                  {groupedTasks[status].map((task) => (
                    <li key={task.id} className={cn("rounded-lg border border-white/[0.06] p-2", task.role === "A" ? "border-l-2 border-l-emerald-300/70 bg-white/[0.035]" : task.role === "B" ? "border-l-2 border-l-sky-300/70 bg-white/[0.035]" : "border-l-2 border-l-violet-300/60 bg-white/[0.035]")}>
                      {editingTaskId === task.id ? (
                        <form onSubmit={(event) => { event.preventDefault(); void updateTask(task, { title: taskEditDraft }).then(() => setEditingTaskId(null)); }} className="space-y-1">
                          <input value={taskEditDraft} onChange={(event) => setTaskEditDraft(event.target.value)} aria-label="Edit task title" maxLength={160} className="w-full rounded-md border border-white/10 bg-slate-950 px-1.5 py-1 text-[10px] text-white" />
                          <Button type="submit" size="sm" className="h-6 w-full px-1 text-[10px]" disabled={!taskEditDraft.trim()}><Save className="size-3" />Save</Button>
                        </form>
                      ) : <p className="break-words text-[11px] leading-4 text-slate-200">{task.title}</p>}
                      <p className="mt-1 text-[9px] text-slate-500">{task.assignee?.displayName || (task.role === "shared" ? "Shared" : `Builder ${task.role}`)}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <button type="button" disabled={!canEdit} onClick={() => { setEditingTaskId(task.id); setTaskEditDraft(task.title); }} aria-label={`Edit ${task.title}`} className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-200 disabled:opacity-40"><Pencil className="size-3" />Edit</button>
                        <span className="flex">
                          <button type="button" disabled={!canEdit || task.order === 0} onClick={() => void reorderTask(task, -1)} aria-label={`Move ${task.title} up`} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronUp className="size-3" /></button>
                          <button type="button" disabled={!canEdit || task.order >= detail.tasks.length - 1} onClick={() => void reorderTask(task, 1)} aria-label={`Move ${task.title} down`} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronDown className="size-3" /></button>
                        </span>
                      </div>
                      <select value={task.status} onChange={(event) => void updateTask(task, { status: event.target.value })} disabled={!canEdit} aria-label={`Move ${task.title}`} className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-300"><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></select>
                      <select value={task.assignee?.id ?? ""} onChange={(event) => void updateTask(task, { assigneeId: event.target.value || null })} disabled={!canEdit} aria-label={`Assign ${task.title}`} className="mt-1 w-full truncate rounded-md border border-white/10 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-400"><option value="">Unassigned</option>{detail.quest.members.map((member) => <option key={member.userId} value={member.userId}>{displayMember(member)}</option>)}</select>
                      <button type="button" disabled={!canEdit} aria-label={`Delete ${task.title}`} onClick={() => void deleteTask(task)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-rose-300 disabled:opacity-40"><Trash2 className="size-3" /> Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(PANEL, "flex min-h-[340px] flex-col md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-sky-300/70 uppercase">02 · Shared contract</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Project spec</h2>
            <p className="text-[11px] text-slate-500">{detail.spec?.editor ? `Last edited by ${detail.spec.editor.displayName || detail.spec.editor.username} · ${new Date(detail.spec.updatedAt).toLocaleString()}` : "Start aligning on the project"} · revision {detail.spec?.revision ?? 0}</p>
          </div>
          <textarea value={specDraft} onChange={(event) => { setSpecDraft(event.target.value); setSpecDirty(true); setSpecConflict(false); }} maxLength={200_000} aria-label="Shared project specification" className="min-h-64 flex-1 resize-none bg-[#050a14]/95 p-4 font-mono text-xs leading-6 text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/50 md:min-h-0" />
          <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[10px]">
            {specConflict ? <span role="alert" className="text-amber-300">Partner edited this spec. Reload their version before saving.</span> : <span className="text-slate-500">{specSaving ? "Saving…" : specDirty ? "Unsaved changes" : "Saved"}</span>}
            {specConflict ? <button type="button" onClick={() => { setSpecConflict(false); setSpecDirty(false); specDirtyRef.current = false; if (detail.spec) setSpecDraft(detail.spec.content); }} className="text-emerald-200 hover:underline">Load latest</button> : null}
          </div>
          {detail.spec?.history.length ? (
            <details className="border-t border-white/8 px-4 py-2">
              <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-300">Version history · {detail.spec.history.length} saves</summary>
              <ol className="mt-2 max-h-24 space-y-1 overflow-y-auto">
                {[...detail.spec.history].reverse().map((version) => <li key={version.revision} className="text-[10px] text-slate-500">Revision {version.revision} · {new Date(version.editedAt).toLocaleString()}</li>)}
              </ol>
            </details>
          ) : null}
        </section>

        <section className={cn(PANEL, "flex min-h-[420px] flex-col border-emerald-300/15 md:min-h-0")}>
          <div className="border-b border-white/8 px-4 py-3.5">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-signal/70 uppercase">03 · Mission guide</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Build together</h2>
            <p className="text-[11px] text-slate-500">A small next step beats a perfect plan.</p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div className={cn("flex gap-3 rounded-xl border p-3", detail.quest.curveball.unlocked ? "border-signal/20 bg-gradient-to-r from-emerald-900/25 to-transparent" : "border-white/8 bg-white/[0.025]")}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-signal/30 bg-signal/[0.08] text-signal">{detail.quest.curveball.unlocked ? <Sparkles className="size-4" /> : <Clock3 className="size-4" />}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-signal uppercase">{detail.quest.curveball.unlocked ? "Curveball unlocked" : `Curveball · unlocks at hour ${detail.quest.curveball.unlockHour}`}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{detail.quest.curveball.text ?? "A surprise challenge is hidden until its scheduled unlock. Keep building the core experience."}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
              <p className="text-[10px] text-slate-500">Quest brief</p>
              <p className="mt-1 leading-relaxed">{detail.quest.brief}</p>
              <p className="mt-3 text-[10px] text-slate-500">Stretch goal</p>
              <p className="mt-1 text-xs leading-relaxed">{detail.quest.stretchGoal}</p>
            </div>
            <form onSubmit={(event) => void getHint(event)} className="space-y-2 rounded-xl border border-white/[0.07] bg-black/15 p-3">
              <label htmlFor="quest-blocker" className="text-[11px] font-medium text-slate-300">What’s blocking you?</label>
              <textarea id="quest-blocker" value={blocker} onChange={(event) => setBlocker(event.target.value)} maxLength={1000} minLength={8} placeholder="Describe the specific problem…" className="min-h-16 w-full rounded-lg border border-white/10 bg-slate-950/80 p-2 text-xs text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50" disabled={!canEdit} />
              <Button type="submit" size="sm" variant="outline" className="w-full" disabled={!canEdit || blocker.trim().length < 8 || busy === "hint"} loading={busy === "hint"}><Sparkles /> Get unstuck</Button>
              {hint ? <p className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs leading-5 text-emerald-50">{hint}</p> : null}
            </form>
            {detail.submission ? (
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3">
                <p className="text-xs font-medium text-emerald-100">{detail.quest.status === "completed" ? "Quest approved" : needsResubmission ? "Changes requested" : "Showcase submitted"}</p>
                <p className="mt-1 text-[11px] text-slate-400">{needsResubmission ? "Update your build and submit a fresh showcase for review." : "Repo and demo are ready for partner review."}</p>
                {detail.quest.status === "submitted" && detail.submission.submittedBy !== currentUserId ? (
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] text-slate-400">Rating
                      <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} className="mt-1 block w-full rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select>
                    </label>
                    <textarea value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} minLength={10} maxLength={2000} placeholder="What worked well? What could improve?" className="min-h-16 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs text-white placeholder:text-slate-600" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={reviewFeedback.trim().length < 10 || busy === "review"} loading={busy === "review"} onClick={() => void submitReview("approved")}>Approve</Button>
                      <Button size="sm" variant="outline" className="flex-1" disabled={reviewFeedback.trim().length < 10 || busy === "review"} onClick={() => void submitReview("changes_requested")}>Request changes</Button>
                    </div>
                  </div>
                ) : detail.quest.status === "submitted" ? <p className="mt-2 text-[11px] text-slate-400">Waiting for your partner’s review.</p> : null}
              </div>
            ) : null}
          </div>
          <div className="border-t border-white/8 p-3">
            <div className="mb-2 max-h-32 space-y-2 overflow-y-auto" aria-live="polite">
              {messages.slice(-8).map((message) => <p key={message.id} className={cn("max-w-[90%] rounded-lg px-2.5 py-2 text-[11px]", message.senderId === currentUserId ? "ml-auto bg-emerald-300/10 text-emerald-50" : "bg-white/[0.05] text-slate-300")}>{message.content}<span className="mt-1 block text-[9px] opacity-50">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p>)}
              {messages.length === 0 ? <p className="py-2 text-center text-[10px] text-slate-600">Start the conversation with your partner.</p> : null}
            </div>
            <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2">
              <Input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message your partner…" aria-label="Message your partner" maxLength={5000} />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!chatText.trim()}><Send /></Button>
            </form>
            <Link href={`/messages?quest=${detail.quest.id}`} className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-200"><MessageSquare className="size-3" /> Open partner messages <ArrowUpRight className="size-3" /></Link>
          </div>
        </section>
      </div>

      {allDone && (!detail.submission || needsResubmission) && canEdit && detail.quest.status !== "submitted" ? (
        <Button type="button" onClick={() => setSubmissionOpen(true)} className="fixed bottom-5 right-5 z-20 shadow-xl"><Rocket /> Build showcase</Button>
      ) : null}

      {submissionOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmissionOpen(false); }}>
          <form onSubmit={(event) => void submitShowcase(event)} className="w-full max-w-xl space-y-4 rounded-2xl border border-white/10 bg-[#0b1710] p-5 shadow-2xl sm:p-7" aria-labelledby="submission-title">
            <div><h2 id="submission-title" className="text-lg font-semibold text-white">Share what you shipped</h2><p className="mt-1 text-xs text-slate-400">Your partner will review the links and build notes.</p></div>
            <label className="block text-xs text-slate-300">Repository URL<Input type="url" required value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/…" className="mt-1" /></label>
            <label className="block text-xs text-slate-300">Live demo URL<Input type="url" required value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} placeholder="https://…" className="mt-1" /></label>
            <label className="block text-xs text-slate-300">Build notes<textarea required minLength={30} maxLength={3000} value={writeUp} onChange={(event) => setWriteUp(event.target.value)} placeholder="What did you build, what did each person contribute, and what should reviewers try?" className="mt-1 min-h-28 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50" /></label>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSubmissionOpen(false)}>Cancel</Button><Button type="submit" loading={busy === "submission"} disabled={busy === "submission"}>Send for review</Button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
