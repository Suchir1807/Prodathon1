"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

type SaveStatus = "saved" | "editing" | "saving" | "error";

const COLUMNS: { status: WorkspaceTaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "doing", title: "In Progress" },
  { status: "done", title: "Done" },
];
const STATUS_ORDER: WorkspaceTaskStatus[] = ["todo", "doing", "done"];

export function ProductivityWorkspace({ workspace }: { workspace: WorkspaceData }) {
  const [scratchpad, setScratchpad] = useState(workspace.scratchpad);
  const scratchpadRef = useRef(workspace.scratchpad);
  const dirtyRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [tasks, setTasks] = useState(workspace.tasks);
  const [taskTitle, setTaskTitle] = useState("");
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [boardError, setBoardError] = useState("");
  const [scratchpadError, setScratchpadError] = useState("");
  const [now, setNow] = useState<number | null>(null);

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
      try {
        const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, { cache: "no-store" });
        const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load tasks.");
        if (!cancelled) {
          setTasks(data.tasks ?? []);
          setBoardError("");
        }
      } catch (error) {
        if (!cancelled) setBoardError(error instanceof Error ? error.message : "Unable to load tasks.");
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

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || pendingTask) return;
    setPendingTask("new");
    setBoardError("");
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to add task.");
      setTasks(data.tasks ?? []);
      setTaskTitle("");
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Unable to add task.");
    } finally {
      setPendingTask(null);
    }
  }

  async function moveTask(taskId: string, direction: "left" | "right") {
    if (pendingTask) return;
    setPendingTask(taskId);
    setBoardError("");
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, direction }),
      });
      const data = (await response.json()) as { tasks?: WorkspaceTask[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to move task.");
      setTasks(data.tasks ?? []);
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Unable to move task.");
    } finally {
      setPendingTask(null);
    }
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
          <Label htmlFor="workspace-scratchpad" className="sr-only">Shared Markdown scratchpad</Label>
          <textarea
            id="workspace-scratchpad"
            value={scratchpad}
            onChange={(event) => editScratchpad(event.target.value)}
            disabled={expired}
            spellCheck={false}
            placeholder={"# Build notes\n\n## Goal\n\n## Decisions\n\n## Links and snippets"}
            className="min-h-[55dvh] flex-1 resize-y rounded-md border border-white/10 bg-[#080d17] p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-700 focus-visible:border-[#ccff00]/40 focus-visible:ring-2 focus-visible:ring-[#ccff00]/10"
          />
          {scratchpadError ? <p role="alert" className="mt-2 text-xs text-red-300">{scratchpadError}</p> : null}
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Task board</h2>
              <p className="mt-1 text-xs text-slate-500">Move work from next up to shipped.</p>
            </div>
            <form className="flex w-full gap-2 sm:w-auto" onSubmit={(event) => void addTask(event)}>
              <Label htmlFor="new-workspace-task" className="sr-only">New task title</Label>
              <Input
                id="new-workspace-task"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Add a task"
                maxLength={160}
                className="sm:w-52"
                disabled={expired}
              />
              <Button type="submit" size="icon" aria-label="Add task" disabled={expired || !taskTitle.trim() || pendingTask !== null}>
                {pendingTask === "new" ? <Loader2 className="animate-spin" /> : <Plus />}
              </Button>
            </form>
          </div>
          {boardError ? <p role="alert" className="mb-3 text-xs text-red-300">{boardError}</p> : null}
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.status);
              return (
                <section key={column.status} className="w-[min(78vw,220px)] shrink-0 border-t border-white/10 pt-3 sm:w-[220px]" aria-label={column.title}>
                  <header className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-200">{column.title}</h3>
                    <span className="min-w-6 text-right text-[11px] tabular-nums text-slate-500">{columnTasks.length}</span>
                  </header>
                  <div className="flex min-h-32 flex-col gap-2">
                    {columnTasks.map((task) => {
                      const index = STATUS_ORDER.indexOf(task.status);
                      return (
                        <article key={task.id} className="rounded-md border border-white/8 bg-white/[0.025] p-3">
                          <p className="break-words text-sm leading-relaxed text-slate-200">{task.title}</p>
                          <div className="mt-3 flex flex-wrap justify-between gap-1">
                            {index > 0 ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                disabled={expired || pendingTask !== null}
                                onClick={() => void moveTask(task.id, "left")}
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
                                disabled={expired || pendingTask !== null}
                                onClick={() => void moveTask(task.id, "right")}
                                aria-label={`Move ${task.title} right`}
                              >
                                Move Right <ArrowRight />
                              </Button>
                            ) : null}
                          </div>
                          {pendingTask === task.id ? <Loader2 className="mt-1 size-3 animate-spin text-slate-500" /> : null}
                        </article>
                      );
                    })}
                    {columnTasks.length === 0 ? <p className={cn("px-1 py-2 text-xs text-slate-600")}>No tasks</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
