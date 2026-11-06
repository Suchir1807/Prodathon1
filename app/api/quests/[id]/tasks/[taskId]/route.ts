import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { createQuestNotification, findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { questTaskUpdateSchema } from "@/lib/validation/schemas";
import Task from "@/models/Task";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, taskId } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (!["active", "changes_requested"].includes(access.quest.status)) {
    return NextResponse.json({ error: "Tasks can only be changed during an active quest." }, { status: 409 });
  }
  if (!mongoose.Types.ObjectId.isValid(taskId)) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = questTaskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task update." }, { status: 400 });
  }
  const update = parsed.data;
  if (update.assigneeId && !access.quest.members.some((member) => member.user.toString() === update.assigneeId)) {
    return NextResponse.json({ error: "Tasks can only be assigned to quest members." }, { status: 400 });
  }
  try {
    await connectDB();
    const task = await Task.findOne({ _id: taskId, quest: access.quest._id });
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    const wasDone = task.status === "done";
    const changes: Record<string, unknown> = {};
    if (update.title !== undefined) changes.title = update.title;
    if (update.role !== undefined) changes.role = update.role;
    if (update.assigneeId !== undefined) changes.assignee = update.assigneeId ? new mongoose.Types.ObjectId(update.assigneeId) : null;
    if (update.order !== undefined) changes.order = update.order;
    if (update.priority !== undefined) changes.priority = update.priority;
    if (update.status !== undefined) {
      changes.status = update.status;
      changes.completedAt = update.status === "done" ? (task.completedAt ?? new Date()) : null;
      changes.completedBy = update.status === "done" ? (task.completedBy ?? access.current._id) : null;
    }
    const updatedTask = await Task.findOneAndUpdate(
      { _id: task._id, quest: access.quest._id, updatedAt: task.updatedAt },
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    );
    if (!updatedTask) return NextResponse.json({ error: "This task changed in another session. Refresh and retry." }, { status: 409 });

    if (!wasDone && updatedTask.status === "done") {
      const partner = access.quest.members.find((member) => !member.user.equals(access.current._id));
      if (partner) {
        await createQuestNotification({
          recipient: partner.user,
          sender: access.current._id,
          type: "task_completed",
          questId: access.quest._id,
          resourceId: updatedTask._id,
          dedupeKey: `task-done:${updatedTask._id}:${updatedTask.completedAt?.getTime()}`,
        });
      }
    }
    return NextResponse.json({
      task: { id: updatedTask._id.toString(), title: updatedTask.title, role: updatedTask.role, assigneeId: updatedTask.assignee?.toString() ?? null, status: updatedTask.status, order: updatedTask.order, priority: updatedTask.priority, completedAt: updatedTask.completedAt?.toISOString() ?? null },
    });
  } catch (error) {
    console.error("Quest task PATCH error:", error);
    return NextResponse.json({ error: "Unable to update task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, taskId } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (!["active", "changes_requested"].includes(access.quest.status)) {
    return NextResponse.json({ error: "Tasks can only be changed during an active quest." }, { status: 409 });
  }
  if (!mongoose.Types.ObjectId.isValid(taskId)) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  try {
    await connectDB();
    const deleted = await Task.findOneAndDelete({ _id: taskId, quest: access.quest._id });
    if (!deleted) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Quest task DELETE error:", error);
    return NextResponse.json({ error: "Unable to delete task." }, { status: 500 });
  }
}
