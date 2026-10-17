import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { findAuthorizedWorkspace } from "@/lib/authorized-workspace";
import { generatedWorkspaceTasksSchema, workspaceTaskSchema } from "@/lib/validation/schemas";
import type { WorkspaceTaskStatus } from "@/models/Workspace";

type RouteContext = { params: Promise<{ id: string }> };
const TASK_STATUSES: WorkspaceTaskStatus[] = ["todo", "doing", "done"];

function isTaskStatus(value: unknown): value is WorkspaceTaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}

function serializeTasks(tasks: { id: string; title: string; status: WorkspaceTaskStatus; priority?: number }[]) {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    ...(task.priority !== undefined ? { priority: task.priority } : {}),
  }));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findAuthorizedWorkspace(id, true);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  return NextResponse.json({ tasks: serializeTasks(access.workspace.tasks) });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findAuthorizedWorkspace(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "tasks" in body
  ) {
    const result = generatedWorkspaceTasksSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid generated tasks." },
        { status: 400 },
      );
    }
    access.workspace.tasks.push(
      ...result.data.tasks.map((task) => ({ ...task, id: randomUUID() })),
    );
    await access.workspace.save();
    return NextResponse.json({ tasks: serializeTasks(access.workspace.tasks) }, { status: 201 });
  }

  const result = workspaceTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid task title." },
      { status: 400 },
    );
  }
  const { title } = result.data;

  access.workspace.tasks.push({ id: randomUUID(), title, status: "todo" });
  await access.workspace.save();
  return NextResponse.json({ tasks: serializeTasks(access.workspace.tasks) }, { status: 201 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findAuthorizedWorkspace(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { taskId?: unknown; direction?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.taskId !== "string") {
    return NextResponse.json({ error: "A valid task ID is required." }, { status: 400 });
  }

  const task = access.workspace.tasks.find((item) => item.id === body.taskId);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  if (body.status !== undefined) {
    if (!isTaskStatus(body.status)) {
      return NextResponse.json({ error: "A valid task status is required." }, { status: 400 });
    }
    task.status = body.status;
  } else {
    if (body.direction !== "left" && body.direction !== "right") {
      return NextResponse.json({ error: "A valid move direction is required." }, { status: 400 });
    }
    const currentIndex = TASK_STATUSES.indexOf(task.status);
    const nextIndex = currentIndex + (body.direction === "right" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= TASK_STATUSES.length) {
      return NextResponse.json({ error: "Task is already at the edge of the board." }, { status: 409 });
    }
    task.status = TASK_STATUSES[nextIndex];
  }

  await access.workspace.save();
  return NextResponse.json({ tasks: serializeTasks(access.workspace.tasks) });
}