"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Clock3, GripVertical, Loader2, MessageSquare, Plus, Save, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { workspaceTaskSchema, type WorkspaceTaskValues } from "@/lib/validation/schemas";
import type { WorkspaceTaskStatus, WorkspaceType } from "@/models/Workspace";

type WorkspaceTask = {
  id: string;
  title: string;
  status: WorkspaceTaskStatus;
};

type WorkspaceData = {
  id: string;
  type: WorkspaceType;
  scratchpad: string;
  tasks: WorkspaceTask[];
  expiresAt: string | null;
};

type WorkspacePartner = { id: string; username: string; displayName: string };
type WorkspaceMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
};
type WorkspaceMessageResponse = { messages?: WorkspaceMessage[]; error?: string };

type SaveStatus = "saved" | "editing" | "saving" | "error";

const COLUMNS: { status: WorkspaceTaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "doing", title: "In Progress" },
  { status: "done", title: "Done" },
];
const STATUS_ORDER: WorkspaceTaskStatus[] = ["todo", "doing", "done"];

function SortableTaskCard({
  task,
  expired,
  pending,
  onMove,
}: {
  task: WorkspaceTask;
  expired: boolean;
  pending: boolean;
  onMove: (taskId: string, direction: "left" | "right") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
    disabled: expired || pending,
  });
  const index = STATUS_ORDER.indexOf(task.status);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <motion.article
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.015 }}
        className="rounded-md border border-white/8 bg-white/[0.025] p-3 transition-shadow hover:shadow-[0_0_20px_rgba(204,255,0,0.08)]"
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${task.title}`}
            className="mt-0.5 cursor-grab touch-none text-slate-600 transition-colors hover:text-[#ccff00] active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-slate-200">{task.title}</p>
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-1">
          {index > 0 ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={expired || pending}
              onClick={() => onMove(task.id, "left")}
              aria-label={`Move ${task.title} left`}
            >
              <ArrowLeft /> Move Left
            </Button>
          ) : <span />}
          {index < STATUS_ORDER.length - 1 ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={expired || pending}
              onClick={() => onMove(task.id, "right")}
              aria-label={`Move ${task.title} right`}
            >
              Move Right <ArrowRight />
            </Button>
          ) : null}
        </div>
        {pending ? <Loader2 className="mt-1 size-3 animate-spin text-slate-500" /> : null}
      </motion.article>
    </div>
  );
}

function WorkspaceChatDock({
  workspaceId,
  currentUserId,
  partner,
  disabled,
}: {
  workspaceId: string;
  currentUserId: string;
  partner: WorkspacePartner;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/messages?workspaceId=${encodeURIComponent(workspaceId)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as WorkspaceMessageResponse;
        if (!response.ok) throw new Error(data.error ?? "Unable to load workspace messages.");
        if (!cancelled) {
          setMessages((current) => {
            const optimistic = current.filter((item) => item.id.startsWith("optimistic-"));
            const serverIds = new Set((data.messages ?? []).map((item) => item.id));
            return [...(data.messages ?? []), ...optimistic.filter((item) => !serverIds.has(item.id))];
          });
          setError("");
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load workspace messages.");
          setLoading(false);
        }
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || disabled || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setMessage("");
    setError("");
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticMessage: WorkspaceMessage = {
      id: optimisticId,
      senderId: currentUserId,
      receiverId: partner.id,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, receiverId: partner.id, content }),
      });
      const data = (await response.json()) as WorkspaceMessage & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to send message.");
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId && item.id !== data.id),
        data,
      ]);
      toast.success("Message delivered");
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      const errorMessage = sendError instanceof Error ? sendError.message : "Unable to send message.";
      setError(errorMessage);
      toast.error("Message was not delivered", { description: errorMessage });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#0b1120]/90" aria-label="Workspace partner chat">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.025]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <MessageSquare className="size-4 text-[#ccff00]" />
          Partner chat
          <span className="text-xs font-normal text-slate-500">@{partner.username}</span>
        </span>
        {open ? <ChevronDown className="size-4 text-slate-500" /> : <ChevronUp className="size-4 text-slate-500" />}
      </button>
      {open ? (
        <div className="grid h-72 grid-rows-[1fr_auto] border-t border-white/8">
          <div className="overflow-y-auto p-4">
            {loading && messages.length === 0 ? <p className="text-xs text-slate-500">Loading conversation…</p> : null}
            {!loading && messages.length === 0 ? <p className="text-xs text-slate-500">Start a conversation with your partner.</p> : null}
            <div className="space-y-3">
              {messages.map((item) => {
                const own = item.senderId === currentUserId;
                const senderName = own ? "You" : partner.displayName || partner.username;
                return (
                  <article key={item.id} className={cn("flex max-w-[85%] items-end gap-2", own && "ml-auto flex-row-reverse")}>
                    <span
                      aria-label={`${senderName} avatar`}
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                        own ? "border-[#ccff00]/25 bg-[#ccff00]/10 text-[#ccff00]" : "border-white/10 bg-white/[0.06] text-slate-300",
                      )}
                    >
                      {senderName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className={cn("flex min-w-0 flex-col gap-1", own ? "items-end" : "items-start")}>
                      <div className={cn("rounded-lg border px-3 py-2", own ? "border-[#ccff00]/15 bg-[#ccff00]/[0.06]" : "border-white/8 bg-white/[0.03]")}>
                        {!own ? <p className="mb-1 text-[10px] font-medium text-[#ccff00]">{senderName}</p> : null}
                        <p className="break-words whitespace-pre-wrap text-sm text-slate-200">{item.content}</p>
                      </div>
                      <time className="text-[10px] text-slate-600" dateTime={item.timestamp}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </div>
                  </article>
                );
              })}
            </div>
            {error ? <p role="status" className="mt-2 text-xs text-red-300">{error}</p> : null}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-white/8 p-3">
            <Label htmlFor="workspace-message" className="sr-only">Message your workspace partner</Label>
            <Input
              id="workspace-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={disabled ? "Workspace ended" : "Send a message"}
              maxLength={5000}
              disabled={disabled}
            />
            <Button type="submit" size="icon" aria-label="Send message" loading={sending} disabled={disabled || !message.trim() || sending}>
              <Send />
            </Button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export function ProductivityWorkspace({
  workspace,
  currentUserId,
  partner,
}: {
  workspace: WorkspaceData;
  currentUserId: string;
  partner: WorkspacePartner;
}) {
  const [scratchpad, setScratchpad] = useState(workspace.scratchpad);
  const scratchpadRef = useRef(workspace.scratchpad);
  const dirtyRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [tasks, setTasks] = useState(workspace.tasks);
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [boardError, setBoardError] = useState("");
  const [scratchpadError, setScratchpadError] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [scratchpadMode, setScratchpadMode] = useState<"write" | "preview">("write");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const taskMutationRef = useRef(false);
  const taskMutationRevisionRef = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: taskErrors, isSubmitting: addingTask },
  } = useForm<WorkspaceTaskValues>({
    resolver: zodResolver(workspaceTaskSchema),
    mode: "onBlur",
    defaultValues: { title: "" },
  });

  useEffect(() => {
    if (!workspace.expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [workspace.expiresAt]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const valueToSave = scratchpad;
    const timeout = window.setTimeout(async () => {
      setSaveStatus("saving");
      setScratchpadError("");
      try {
        const response = await fetch(`/api/workspaces/${workspace.id}/scratchpad`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scratchpad: valueToSave }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Autosave failed.");
        if (scratchpadRef.current === valueToSave) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        }
      } catch (error) {
        setSaveStatus("error");
        setScratchpadError(error instanceof Error ? error.message : "Autosave failed.");
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [scratchpad, workspace.id]);

  useEffect(() => {
    let cancelled = false;

    async function syncScratchpad() {
      try {
        const response = await fetch(`/api/workspaces/${workspace.id}/scratchpad`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { scratchpad?: string };
        if (!response.ok || cancelled || dirtyRef.current || typeof data.scratchpad !== "string") return;
        if (scratchpadRef.current !== data.scratchpad) {
          scratchpadRef.current = data.scratchpad;
          setScratchpad(data.scratchpad);
          setSaveStatus("saved");
        }
      } catch {
        // The next poll retries; local edits remain available.
      }
    }

    const interval = window.setInterval(() => void syncScratchpad(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [workspace.id]);

  useEffect(() => {
    let cancelled = false;

    async function syncTasks() {
      if (taskMutationRef.current) return;
      const revision = taskMutationRevisionRef.current;
      try {
        const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, { cache: "no-store" });
        const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load tasks.");
        if (!cancelled && !taskMutationRef.current && revision === taskMutationRevisionRef.current) {
          setTasks(data.tasks ?? []);
          setBoardError("");
        }
      } catch (error) {
        if (!cancelled && revision === taskMutationRevisionRef.current) {
          setBoardError(error instanceof Error ? error.message : "Unable to load tasks.");
        }
      }
    }

    void syncTasks();
    const interval = window.setInterval(() => void syncTasks(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [workspace.id]);

  function editScratchpad(value: string) {
    scratchpadRef.current = value;
    dirtyRef.current = true;
    setScratchpad(value);
    setSaveStatus("editing");
  }

  async function addTask(values: WorkspaceTaskValues) {
    if (taskMutationRef.current || pendingTask) return;
    taskMutationRevisionRef.current += 1;
    taskMutationRef.current = true;
    setPendingTask("new");
    setBoardError("");
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to add task.");
      setTasks(data.tasks ?? []);
      reset();
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Unable to add task.");
    } finally {
      setPendingTask(null);
      taskMutationRef.current = false;
    }
  }

  async function moveTaskToStatus(taskId: string, targetStatus: WorkspaceTaskStatus) {
    if (taskMutationRef.current || pendingTask) return;
    const previousTasks = tasks;
    const task = previousTasks.find((item) => item.id === taskId);
    if (!task) return;
    const currentIndex = STATUS_ORDER.indexOf(task.status);
    const targetIndex = STATUS_ORDER.indexOf(targetStatus);
    if (targetIndex < 0 || targetIndex === currentIndex) return;
    const optimisticTasks = previousTasks.map((item) =>
      item.id === taskId ? { ...item, status: targetStatus } : item,
    );
    taskMutationRevisionRef.current += 1;
    taskMutationRef.current = true;
    setPendingTask(taskId);
    setTasks(optimisticTasks);
    setBoardError("");
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: targetStatus }),
      });
      const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to move task.");
      setTasks(data.tasks ?? []);
    } catch (error) {
      setTasks(previousTasks);
      const message = error instanceof Error ? error.message : "Unable to move task.";
      setBoardError(message);
      toast.error("Task move failed", { description: `${message} The task was restored.` });
    } finally {
      setPendingTask(null);
      taskMutationRef.current = false;
    }
  }

  function moveTask(taskId: string, direction: "left" | "right") {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const nextIndex = STATUS_ORDER.indexOf(task.status) + (direction === "right" ? 1 : -1);
    const targetStatus = STATUS_ORDER[nextIndex];
    if (targetStatus) void moveTaskToStatus(taskId, targetStatus);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    if (!event.over) return;
    const task = tasks.find((item) => item.id === String(event.active.id));
    const overStatus = event.over.data.current?.status as WorkspaceTaskStatus | undefined;
    if (task && overStatus && task.status !== overStatus) {
      void moveTaskToStatus(task.id, overStatus);
    }
  }

  function submitTaskForm(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(addTask)(event);
  }

  const secondsLeft = workspace.expiresAt && now !== null
    ? Math.max(0, Math.floor((new Date(workspace.expiresAt).getTime() - now) / 1000))
    : null;
  const expired = secondsLeft === 0;
  const countdown = secondsLeft === null
    ? "--:--:--"
    : [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1600px] flex-col px-4 py-5 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#ccff00] uppercase">
            {workspace.type === "sprint" ? "Flash Build" : "Skill Trade"}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-white">Shared productivity workspace</h1>
        </div>
        {workspace.type === "sprint" ? (
          <div className="flex items-center gap-3 border border-red-400/25 bg-red-950/30 px-4 py-2">
            <Clock3 className="size-4 text-red-300" />
            <div>
              <p className="text-[10px] tracking-wide text-red-200/70 uppercase">
                {expired ? "Build window ended" : "Time remaining"}
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums text-white">{countdown}</p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="grid flex-1 gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="flex min-h-[55dvh] flex-col">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Shared scratchpad</h2>
              <p className="mt-1 text-xs text-slate-500">Markdown, notes, links, and working snippets</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-slate-400" aria-live="polite">
              {saveStatus === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : saveStatus === "saved" ? <Check className="size-3.5 text-[#ccff00]" /> : <Save className="size-3.5" />}
              {saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "Unsaved"}
            </span>
          </div>
          <div className="mb-2 flex gap-1" role="tablist" aria-label="Scratchpad mode">
            {(["write", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={scratchpadMode === mode}
                onClick={() => setScratchpadMode(mode)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs capitalize transition-colors",
                  scratchpadMode === mode ? "bg-[#ccff00]/10 text-[#ccff00]" : "text-slate-500 hover:text-slate-200",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          {scratchpadMode === "write" ? (
            <>
              <Label htmlFor="workspace-scratchpad" className="sr-only">Shared Markdown scratchpad</Label>
              <textarea
                id="workspace-scratchpad"
                role="tabpanel"
                value={scratchpad}
                onChange={(event) => editScratchpad(event.target.value)}
                disabled={expired}
                spellCheck={false}
                placeholder={"# Build notes\n\n## Goal\n\n## Decisions\n\n## Links and snippets"}
                className="min-h-[55dvh] flex-1 resize-y rounded-md border border-white/10 bg-[#080d17] p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-700 focus-visible:border-[#ccff00]/40 focus-visible:ring-2 focus-visible:ring-[#ccff00]/10"
              />
            </>
          ) : (
            <div role="tabpanel" aria-label="Markdown preview" className="workspace-markdown min-h-[55dvh] flex-1 overflow-y-auto rounded-md border border-white/10 bg-[#080d17] p-4 text-sm leading-relaxed text-slate-300">
              {scratchpad ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {scratchpad}
                </ReactMarkdown>
              ) : <p className="text-slate-600">Nothing to preview yet.</p>}
            </div>
          )}
          {scratchpadError ? <p role="alert" className="mt-2 text-xs text-red-300">{scratchpadError}</p> : null}
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Task board</h2>
              <p className="mt-1 text-xs text-slate-500">Move work from next up to shipped.</p>
            </div>
            <form className="flex w-full gap-2 sm:w-auto" onSubmit={submitTaskForm} noValidate>
              <Label htmlFor="new-workspace-task" className="sr-only">New task title</Label>
              <Input
                id="new-workspace-task"
                placeholder="Add a task"
                aria-invalid={Boolean(taskErrors.title)}
                aria-describedby={taskErrors.title ? "workspace-task-error" : undefined}
                {...register("title")}
                className="sm:w-52"
                disabled={expired || pendingTask !== null}
              />
              <Button type="submit" size="icon" aria-label="Add task" loading={pendingTask === "new" || addingTask} disabled={expired || pendingTask !== null}>
                <Plus />
              </Button>
            </form>
          </div>
          {taskErrors.title ? <p id="workspace-task-error" className="mb-3 text-xs font-mono text-rose-500">{taskErrors.title.message}</p> : null}
          {boardError ? <p role="alert" className="mb-3 text-xs text-red-300">{boardError}</p> : null}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event) => setActiveTaskId(String(event.active.id))}
            onDragCancel={() => setActiveTaskId(null)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-3" aria-label="Task board; drag tasks between adjacent columns">
              {COLUMNS.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.status);
                return (
                  <TaskColumn
                    key={column.status}
                    status={column.status}
                    title={column.title}
                    tasks={columnTasks}
                    expired={expired}
                    pendingTask={pendingTask}
                    onMove={moveTask}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeTaskId ? (() => {
                const task = tasks.find((item) => item.id === activeTaskId);
                return task ? (
                  <div className="rotate-1 rounded-md border border-[#ccff00]/30 bg-[#10182b] p-3 shadow-xl shadow-black/40">
                    <p className="text-sm text-slate-200">{task.title}</p>
                  </div>
                ) : null;
              })() : null}
            </DragOverlay>
          </DndContext>
        </section>
      </div>
      <WorkspaceChatDock
        workspaceId={workspace.id}
        currentUserId={currentUserId}
        partner={partner}
        disabled={expired}
      />
    </div>
  );
}

function TaskColumn({
  status,
  title,
  tasks,
  expired,
  pendingTask,
  onMove,
}: {
  status: WorkspaceTaskStatus;
  title: string;
  tasks: WorkspaceTask[];
  expired: boolean;
  pendingTask: string | null;
  onMove: (taskId: string, direction: "left" | "right") => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
    disabled: expired || pendingTask !== null,
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "w-[min(78vw,220px)] shrink-0 border-t border-white/10 pt-3 transition-colors sm:w-[220px]",
        isOver && "border-[#ccff00]/60 bg-[#ccff00]/[0.025]",
      )}
      aria-label={title}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
        <span className="min-w-6 text-right text-[11px] tabular-nums text-slate-500">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-32 flex-col gap-2">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                expired={expired}
                pending={pendingTask !== null}
                onMove={onMove}
              />
            ))}
          </AnimatePresence>
          {tasks.length === 0 ? <p className="px-1 py-2 text-xs text-slate-600">No tasks</p> : null}
        </div>
      </SortableContext>
    </section>
  );
}
