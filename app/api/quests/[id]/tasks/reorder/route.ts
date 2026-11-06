import { NextResponse } from "next/server";

import { findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { questTaskReorderSchema } from "@/lib/validation/schemas";
import Task from "@/models/Task";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
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
  const parsed = questTaskReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task order." }, { status: 400 });
  }
  try {
    await connectDB();
    const tasks = await Task.find({ quest: access.quest._id }).select("_id").lean();
    if (tasks.length !== parsed.data.taskIds.length ||
      tasks.some((task) => !parsed.data.taskIds.includes(task._id.toString()))) {
      return NextResponse.json({ error: "The task list changed. Refresh and retry." }, { status: 409 });
    }
    const operations = parsed.data.taskIds.map((taskId, order) => ({
      updateOne: { filter: { _id: taskId, quest: access.quest._id }, update: { $set: { order } } },
    }));
    await Task.bulkWrite(operations, { ordered: true });
    return NextResponse.json({ reordered: true });
  } catch (error) {
    console.error("Quest task reorder error:", error);
    return NextResponse.json({ error: "Unable to reorder tasks." }, { status: 500 });
  }
}
