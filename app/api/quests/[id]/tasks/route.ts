import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { questTaskCreateSchema } from "@/lib/validation/schemas";
import Task from "@/models/Task";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const tasks = await Task.find({ quest: access.quest._id }).sort({ order: 1 }).lean();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Quest tasks GET error:", error);
    return NextResponse.json({ error: "Unable to load tasks." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = questTaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task." }, { status: 400 });
  }
  const { role, assigneeId } = parsed.data;
  const roleMember = role === "shared" ? null : access.quest.members.find((member) => member.role === role);
  const targetId = assigneeId ?? roleMember?.user.toString() ?? null;
  if (targetId && !access.quest.members.some((member) => member.user.toString() === targetId)) {
    return NextResponse.json({ error: "Tasks can only be assigned to quest members." }, { status: 400 });
  }
  try {
    await connectDB();
    const existing = await Task.findOne({
      quest: access.quest._id,
      createdBy: access.current._id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (existing) {
      return NextResponse.json({
        task: { id: existing._id.toString(), title: existing.title, role: existing.role, assigneeId: existing.assignee?.toString() ?? null, status: existing.status, order: existing.order, priority: existing.priority },
      });
    }
    const last = await Task.findOne({ quest: access.quest._id }).sort({ order: -1 }).select("order").lean();
    const task = await Task.create({
      quest: access.quest._id,
      title: parsed.data.title,
      role,
      assignee: targetId ? new mongoose.Types.ObjectId(targetId) : null,
      status: "todo",
      order: (last?.order ?? -1) + 1,
      priority: parsed.data.priority,
      createdBy: access.current._id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({
      task: { id: task._id.toString(), title: task.title, role: task.role, assigneeId: task.assignee?.toString() ?? null, status: task.status, order: task.order, priority: task.priority },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const existing = await Task.findOne({
        quest: access.quest._id,
        createdBy: access.current._id,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      if (existing) {
        return NextResponse.json({
          task: { id: existing._id.toString(), title: existing.title, role: existing.role, assigneeId: existing.assignee?.toString() ?? null, status: existing.status, order: existing.order, priority: existing.priority },
        });
      }
    }
    console.error("Quest task POST error:", error);
    return NextResponse.json({ error: "Unable to create task." }, { status: 500 });
  }
}
