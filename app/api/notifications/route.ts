import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

type NotificationSender = {
  _id: Types.ObjectId;
  username: string;
  displayName?: string;
  name?: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const current = await User.findOne({ username }).select("_id following").lean();
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: current._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate<{ sender: NotificationSender | null }>("sender", "username displayName name")
        .lean(),
      Notification.countDocuments({ recipient: current._id, isRead: false }),
    ]);
    const followingIds = new Set((current.following ?? []).map((id) => id.toString()));

    return NextResponse.json({
      unreadCount,
      notifications: notifications.flatMap((notification) => {
        const sender = notification.sender;
        if (!sender) return [];
        return [{
          id: notification._id.toString(),
          type: notification.type,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          sender: {
            id: sender._id.toString(),
            username: sender.username,
            displayName:
              sender.displayName?.trim() ||
              sender.name?.trim() ||
              sender.username,
            isFollowing: followingIds.has(sender._id.toString()),
          },
        }];
      }),
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const current = await User.findOne({ username }).select("_id").lean();
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await Notification.updateMany(
      { recipient: current._id, isRead: false },
      { $set: { isRead: true } },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Unable to mark notifications as read." }, { status: 500 });
  }
}
