import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { createQuestNotification, findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { submissionSchema } from "@/lib/validation/schemas";
import Quest from "@/models/Quest";
import Submission from "@/models/Submission";
import Task from "@/models/Task";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success || !parsed.data.idempotencyKey) {
    return NextResponse.json({ error: parsed.success ? "An idempotency key is required." : parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    await connectDB();
    const existing = await Submission.findOne({
      quest: access.quest._id,
      submittedBy: access.current._id,
      idempotencyKey: parsed.data.idempotencyKey,
    }).lean();
    if (existing) return NextResponse.json({ submissionId: existing._id.toString(), status: existing.status });

    const tasks = await Task.find({ quest: access.quest._id }).select("status").lean();
    if (!tasks.length || tasks.some((task) => task.status !== "done")) {
      return NextResponse.json({ error: "Complete every quest task before submitting your showcase." }, { status: 409 });
    }

    const connection = await connectDB();
    const session = await connection.startSession();
    let submissionId = "";
    try {
      await session.withTransaction(async () => {
        const quest = await Quest.findById(access.quest._id).session(session);
        if (!quest || !["active", "changes_requested"].includes(quest.status)) {
          throw new Error("QUEST_NOT_SUBMITTABLE");
        }
        if (quest.deadline && quest.deadline.getTime() < Date.now() && quest.status !== "changes_requested") {
          throw new Error("QUEST_EXPIRED");
        }
        const [submission] = await Submission.create([{
          quest: quest._id,
          submittedBy: access.current._id,
          repositoryUrl: parsed.data.repositoryUrl,
          demoUrl: parsed.data.demoUrl,
          writeUp: parsed.data.writeUp,
          status: "pending_review",
          idempotencyKey: parsed.data.idempotencyKey,
        }], { session });
        quest.status = "submitted";
        quest.submissionId = submission._id;
        await quest.save({ session });
        submissionId = submission._id.toString();
      });
    } finally {
      await session.endSession();
    }

    const partner = access.quest.members.find((member) => !member.user.equals(access.current._id));
    if (partner) {
      await createQuestNotification({
        recipient: partner.user,
        sender: access.current._id,
        type: "submission",
        questId: access.quest._id,
        resourceId: new (await import("mongoose")).Types.ObjectId(submissionId),
        dedupeKey: `submission:${submissionId}:${partner.user}`,
      });
    }
    return NextResponse.json({ submissionId, status: "pending_review" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUEST_NOT_SUBMITTABLE") return NextResponse.json({ error: "This quest cannot be submitted in its current state." }, { status: 409 });
    if (message === "QUEST_EXPIRED") return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const existing = await Submission.findOne({
        quest: access.quest._id,
        submittedBy: access.current._id,
        idempotencyKey: parsed.data.idempotencyKey,
      }).lean();
      if (existing) return NextResponse.json({ submissionId: existing._id.toString(), status: existing.status });
    }
    console.error("Quest submission error:", error);
    return NextResponse.json({ error: "Unable to submit your showcase." }, { status: 500 });
  }
}
