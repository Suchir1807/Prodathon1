import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { findAuthorizedSessionRoom } from "@/lib/authorized-session-room";
import connectDB from "@/lib/mongodb";
import { messageCreateSchema } from "@/lib/validation/schemas";
import Message from "@/models/Message";
import User from "@/models/User";

async function getMutuals(username: string) {
  const current = await User.findOne({ username }).select("_id following").lean();
  if (!current) return null;

  const following = current.following ?? [];
  const users = await User.find({
    _id: { $in: following },
    following: current._id,
  })
    .select("username displayName skillsHave")
    .sort({ username: 1 })
    .lean();

  return {
    currentId: current._id,
    ids: users.map((user) => user._id.toString()),
    users: users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName ?? "",
      skillsHave: user.skillsHave ?? [],
    })),
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const sessionRoomId = new URL(request.url).searchParams.get("sessionRoomId");
    if (sessionRoomId !== null) {
      if (!sessionRoomId) {
        return NextResponse.json({ error: "Invalid sessionRoomId." }, { status: 400 });
      }
      const access = await findAuthorizedSessionRoom(sessionRoomId);
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }

      const partnerId = access.room.members.find(
        (userId) => userId.toString() !== access.current._id.toString(),
      );
      if (!partnerId) {
        return NextResponse.json({ error: "Session partner not found." }, { status: 404 });
      }

      const partner = await User.findById(partnerId)
        .select("_id username displayName")
        .lean();
      if (!partner) {
        return NextResponse.json({ error: "Session partner not found." }, { status: 404 });
      }

      const messages = await Message.find({
        sessionRoomId: access.room._id,
        $or: [
          { senderId: access.current._id, receiverId: partnerId },
          { senderId: partnerId, receiverId: access.current._id },
        ],
      })
        .sort({ timestamp: -1 })
        .limit(500)
        .lean();

      return NextResponse.json({
        partner: {
          id: partner._id.toString(),
          username: partner.username,
          displayName: partner.displayName ?? "",
        },
        messages: messages.reverse().map((message) => ({
          id: message._id.toString(),
          senderId: message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          content: message.content,
          timestamp: message.timestamp.toISOString(),
        })),
      });
    }

    const mutuals = await getMutuals(username);
    if (!mutuals) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const selectedId = new URL(request.url).searchParams.get("with");
    if (selectedId && !mutuals.ids.includes(selectedId)) {
      return NextResponse.json({ error: "Messaging is only available between mutuals." }, { status: 403 });
    }

    const filter: Record<string, unknown> = {
      $or: [
        { senderId: mutuals.currentId, receiverId: { $in: mutuals.ids } },
        { receiverId: mutuals.currentId, senderId: { $in: mutuals.ids } },
      ],
    };
    if (selectedId) {
      const targetId = new mongoose.Types.ObjectId(selectedId);
      filter.$or = [
        { senderId: mutuals.currentId, receiverId: targetId },
        { senderId: targetId, receiverId: mutuals.currentId },
      ];
    }

    const messages = await Message.find(filter).sort({ timestamp: -1 }).limit(500).lean();
    return NextResponse.json({
      mutuals: mutuals.users,
      messages: messages.reverse().map((message) => ({
        id: message._id.toString(),
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ error: "Unable to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = messageCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  const { receiverId, content, sessionRoomId, idempotencyKey } = parsed.data;

  try {
    await connectDB();
    const current = await User.findOne({ username }).select("_id following").lean();
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let authorizedReceiverId: typeof current._id;
    let messageRoomId: mongoose.Types.ObjectId | undefined;
    if (sessionRoomId) {
      const access = await findAuthorizedSessionRoom(sessionRoomId);
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
      if (current._id.toString() !== access.current._id.toString()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const partnerId = access.room.members.find(
        (userId) => userId.toString() !== access.current._id.toString(),
      );
      if (!partnerId || partnerId.toString() !== receiverId) {
        return NextResponse.json({ error: "Receiver is not a member of this SessionRoom." }, { status: 403 });
      }
      authorizedReceiverId = partnerId;
      messageRoomId = access.room._id;
    } else {
      const target = await User.findById(receiverId).select("_id following").lean();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const mutual = (current.following ?? []).some((id) => id.toString() === receiverId) &&
        (target.following ?? []).some((id) => id.toString() === current._id.toString());
      if (!mutual) {
        return NextResponse.json({ error: "Messaging is only available between mutuals." }, { status: 403 });
      }
      authorizedReceiverId = target._id;
    }

    const message = await Message.create({
      senderId: current._id,
      receiverId: authorizedReceiverId,
      ...(messageRoomId ? { sessionRoomId: messageRoomId } : {}),
      content: content.trim(),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    return NextResponse.json({
      id: message._id.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      content: message.content,
      timestamp: message.timestamp.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}