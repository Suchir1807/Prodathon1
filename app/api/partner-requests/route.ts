import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { createQuestNotification } from "@/lib/quest-access";
import { requireCurrentUser, publicUserSummary } from "@/lib/session-user";
import { partnerRequestSchema, partnerRequestResponseSchema } from "@/lib/validation/schemas";
import PartnerRequest from "@/models/PartnerRequest";
import Quest from "@/models/Quest";
import SharedSpec from "@/models/SharedSpec";
import Task from "@/models/Task";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const [received, sent] = await Promise.all([
      PartnerRequest.find({ recipient: current._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("sender", "username displayName skillsHave skillsLearn domainInterests")
        .lean(),
      PartnerRequest.find({ sender: current._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("recipient", "username displayName skillsHave skillsLearn domainInterests")
        .lean(),
    ]);
    return NextResponse.json({
      received: received.map((item) => ({
        id: item._id.toString(),
        createdAt: item.createdAt.toISOString(),
        sender: publicUserSummary(item.sender as never),
      })),
      sent: sent.map((item) => ({
        id: item._id.toString(),
        createdAt: item.createdAt.toISOString(),
        recipient: publicUserSummary(item.recipient as never),
      })),
    });
  } catch (error) {
    console.error("Partner requests GET error:", error);
    return NextResponse.json({ error: "Unable to load partner requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = partnerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Choose a valid partner." }, { status: 400 });
  }

  try {
    await connectDB();
    const recipient = await User.findById(parsed.data.recipientId)
      .select("_id")
      .lean();
    if (!recipient) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (recipient._id.equals(current._id)) {
      return NextResponse.json({ error: "You cannot send a request to yourself." }, { status: 400 });
    }
    const active = await PartnerRequest.findOne({
      status: "pending",
      $or: [
        { sender: current._id, recipient: recipient._id },
        { sender: recipient._id, recipient: current._id },
      ],
    }).lean();
    if (active) return NextResponse.json({ error: "A partner request is already pending." }, { status: 409 });
    const previous = await PartnerRequest.findOne({
      sender: current._id,
      idempotencyKey: parsed.data.idempotencyKey,
    }).select("_id status").lean();
    if (previous) {
      if (previous.status === "pending") {
        await createQuestNotification({
          recipient: recipient._id,
          sender: current._id,
          type: "partner_request",
          resourceId: previous._id,
          dedupeKey: `partner-request:${previous._id}`,
        });
      }
      return NextResponse.json({ id: previous._id.toString(), status: previous.status }, { status: 200 });
    }

    const requestDoc = await PartnerRequest.create({
      sender: current._id,
      recipient: recipient._id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    await createQuestNotification({
      recipient: recipient._id,
      sender: current._id,
      type: "partner_request",
      resourceId: requestDoc._id,
      dedupeKey: `partner-request:${requestDoc._id}`,
    });
    return NextResponse.json({ id: requestDoc._id.toString(), status: requestDoc.status }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const previous = await PartnerRequest.findOne({
        sender: current._id,
        idempotencyKey: parsed.data.idempotencyKey,
      }).select("_id status").lean();
      if (previous) return NextResponse.json({ id: previous._id.toString(), status: previous.status });
      return NextResponse.json({ error: "This request was already sent." }, { status: 409 });
    }
    console.error("Partner request POST error:", error);
    return NextResponse.json({ error: "Unable to send partner request." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = partnerRequestResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid response." }, { status: 400 });
  }
  try {
    await connectDB();
    const requestDoc = await PartnerRequest.findOne({
      _id: parsed.data.requestId,
      recipient: current._id,
    });
    if (!requestDoc) return NextResponse.json({ error: "Partner request not found." }, { status: 404 });

    if (requestDoc.status !== "pending") {
      const existingQuest = await Quest.findOne({ sourceRequest: requestDoc._id }).select("_id").lean();
      if (parsed.data.action === "accept" && existingQuest) {
        await Promise.all([
          createQuestNotification({
            recipient: requestDoc.sender,
            sender: current._id,
            type: "request_accepted",
            questId: existingQuest._id,
            resourceId: requestDoc._id,
            dedupeKey: `request-accepted:${requestDoc._id}`,
          }),
          createQuestNotification({
            recipient: requestDoc.recipient,
            sender: requestDoc.sender,
            type: "quest_ready",
            questId: existingQuest._id,
            dedupeKey: `quest-ready:${existingQuest._id}:${requestDoc.recipient}`,
          }),
        ]);
        return NextResponse.json({ status: "accepted", questId: existingQuest._id.toString() });
      }
      return NextResponse.json({ error: "This request has already been answered." }, { status: 409 });
    }
    if (parsed.data.action === "decline") {
      requestDoc.status = "declined";
      requestDoc.respondedAt = new Date();
      await requestDoc.save();
      return NextResponse.json({ status: "declined" });
    }

    const [sender, recipient] = await Promise.all([
      User.findById(requestDoc.sender).select("username displayName skillsHave skillsLearn domainInterests").lean(),
      User.findById(requestDoc.recipient).select("username displayName skillsHave skillsLearn domainInterests").lean(),
    ]);
    if (!sender || !recipient) return NextResponse.json({ error: "A request member is no longer available." }, { status: 404 });
    const toProfile = (user: typeof sender) => ({
      name: user.displayName?.trim() || user.username,
      canTeach: user.skillsHave ?? [],
      wantsToLearn: user.skillsLearn ?? [],
      domains: user.domainInterests ?? [],
    });

    const { generateCollaborativeQuest } = await import("@/lib/generate-collab-quest");
    const generated = await generateCollaborativeQuest(toProfile(sender), toProfile(recipient));
    const connection = await connectDB();
    const mongoSession = await connection.startSession();
    let questId = "";
    try {
      await mongoSession.withTransaction(async () => {
        const accepted = await PartnerRequest.findOneAndUpdate(
          { _id: requestDoc._id, recipient: current._id, status: "pending" },
          { $set: { status: "accepted", respondedAt: new Date() } },
          { returnDocument: "after", session: mongoSession },
        );
        if (!accepted) {
          const existing = await Quest.findOne({ sourceRequest: requestDoc._id }).session(mongoSession);
          if (existing) {
            questId = existing._id.toString();
            return;
          }
          throw new Error("REQUEST_ALREADY_ANSWERED");
        }
        const [quest] = await Quest.create([{
          sourceRequest: requestDoc._id,
          members: [
            { user: sender._id, role: "A", acceptedAt: null },
            { user: recipient._id, role: "B", acceptedAt: null },
          ],
          title: generated.quest.title,
          brief: generated.quest.brief,
          skillsUsed: generated.quest.skillsUsed,
          roles: generated.quest.roles,
          curveball: {
            text: generated.quest.curveball.text,
            unlockHour: generated.quest.curveball.unlockHour,
            unlockedAt: null,
            taskAdded: false,
          },
          stretchGoal: generated.quest.stretchGoal,
          generationSource: generated.source,
          status: "pending",
        }], { session: mongoSession });
        await Task.create(generated.quest.tasks.map((task, index) => ({
          quest: quest._id,
          title: task.title,
          role: task.role,
          assignee: task.role === "A" ? sender._id : task.role === "B" ? recipient._id : null,
          status: "todo",
          order: index,
          priority: task.priority,
          createdBy: current._id,
        })), { session: mongoSession, ordered: true });
        await SharedSpec.create([{
          quest: quest._id,
          content: generated.quest.sharedSpec,
          revision: 1,
          editor: current._id,
          history: [{ content: generated.quest.sharedSpec, revision: 1, editor: current._id, editedAt: new Date() }],
        }], { session: mongoSession });
        questId = quest._id.toString();
      });
    } finally {
      await mongoSession.endSession();
    }

    await Promise.all([
      createQuestNotification({
        recipient: sender._id,
        sender: current._id,
        type: "request_accepted",
        questId: new mongoose.Types.ObjectId(questId),
        resourceId: requestDoc._id,
        dedupeKey: `request-accepted:${requestDoc._id}`,
      }),
      createQuestNotification({
        recipient: recipient._id,
        sender: sender._id,
        type: "quest_ready",
        questId: new mongoose.Types.ObjectId(questId),
        dedupeKey: `quest-ready:${questId}:${recipient._id}`,
      }),
    ]);
    return NextResponse.json({ status: "accepted", questId, source: generated.source });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_ALREADY_ANSWERED") {
      return NextResponse.json({ error: "This request was answered by another action." }, { status: 409 });
    }
    console.error("Partner request response error:", error);
    return NextResponse.json({ error: "Unable to create the shared quest." }, { status: 500 });
  }
}
