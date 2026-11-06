import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { createQuestNotification, findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { questMessageSchema } from "@/lib/validation/schemas";
import Message from "@/models/Message";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    await connectDB();
    const partner = access.quest.members.find((member) => !member.user.equals(access.current._id));
    if (!partner) return NextResponse.json({ error: "Quest partner not found." }, { status: 404 });
    await Message.updateMany(
      { questId: access.quest._id, senderId: partner.user, receiverId: access.current._id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    const messages = await Message.find({ questId: access.quest._id })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({
      messages: messages.reverse().map((message) => ({
        id: message._id.toString(),
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        readAt: message.readAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Quest messages GET error:", error);
    return NextResponse.json({ error: "Unable to load quest messages." }, { status: 500 });
  }
}

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
  const parsed = questMessageSchema.safeParse(body);
  if (!parsed.success || !parsed.data.idempotencyKey) {
    return NextResponse.json({ error: parsed.success ? "An idempotency key is required." : parsed.error.issues[0]?.message }, { status: 400 });
  }
  try {
    await connectDB();
    const partner = access.quest.members.find((member) => !member.user.equals(access.current._id));
    if (!partner) return NextResponse.json({ error: "Quest partner not found." }, { status: 404 });
    const message = await Message.findOneAndUpdate(
      { questId: access.quest._id, senderId: access.current._id, idempotencyKey: parsed.data.idempotencyKey },
      {
        $setOnInsert: {
          questId: access.quest._id,
          senderId: access.current._id,
          receiverId: partner.user,
          content: parsed.data.content,
          idempotencyKey: parsed.data.idempotencyKey,
          timestamp: new Date(),
          readAt: null,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    await createQuestNotification({
      recipient: partner.user,
      sender: access.current._id,
      type: "new_message",
      questId: access.quest._id,
      resourceId: message._id,
      dedupeKey: `quest-message:${message._id}`,
    });
    return NextResponse.json({
      message: {
        id: message._id.toString(),
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        readAt: message.readAt?.toISOString() ?? null,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const existing = await Message.findOne({
        questId: access.quest._id,
        senderId: access.current._id,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      if (existing) return NextResponse.json({ message: {
        id: existing._id.toString(),
        senderId: existing.senderId.toString(),
        receiverId: existing.receiverId.toString(),
        content: existing.content,
        timestamp: existing.timestamp.toISOString(),
        readAt: existing.readAt?.toISOString() ?? null,
      } });
    }
    console.error("Quest messages POST error:", error);
    return NextResponse.json({ error: "Unable to send quest message." }, { status: 500 });
  }
}
