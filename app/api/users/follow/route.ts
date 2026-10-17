import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(request: Request) {
  const sessionUser = await getServerSession(authOptions);
  const username = sessionUser?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let targetUserId: unknown;
  try {
    ({ targetUserId } = (await request.json()) as { targetUserId?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof targetUserId !== "string" || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    return NextResponse.json({ error: "A valid targetUserId is required." }, { status: 400 });
  }

  const connection = await connectDB();
  const transaction = await connection.startSession();
  let result: { following: boolean; followerCount: number } | undefined;

  try {
    await transaction.withTransaction(async () => {
      const current = await User.findOne({ username }).select("_id").session(transaction);
      if (!current) throw new Error("CURRENT_USER_NOT_FOUND");
      if (current._id.toString() === targetUserId) throw new Error("CANNOT_FOLLOW_SELF");

      const target = await User.findById(targetUserId)
        .select("followers")
        .session(transaction);
      if (!target) throw new Error("TARGET_USER_NOT_FOUND");

      const alreadyFollowing = target.followers.some(
        (followerId) => followerId.toString() === current._id.toString(),
      );
      const update = alreadyFollowing
        ? { $pull: { followers: current._id } }
        : { $addToSet: { followers: current._id } };
      const reverseUpdate = alreadyFollowing
        ? { $pull: { following: target._id } }
        : { $addToSet: { following: target._id } };

      await User.updateOne({ _id: target._id }, update, { session: transaction });
      await User.updateOne({ _id: current._id }, reverseUpdate, { session: transaction });
      if (!alreadyFollowing) {
        await Notification.create(
          [{ recipient: target._id, sender: current._id, type: "follow" }],
          { session: transaction },
        );
      }
      result = {
        following: !alreadyFollowing,
        followerCount: target.followers.length + (alreadyFollowing ? -1 : 1),
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "TARGET_USER_NOT_FOUND") {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "CANNOT_FOLLOW_SELF") {
      return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
    }
    console.error("User follow POST error:", error);
    return NextResponse.json({ error: "Unable to update follow status." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }

  return NextResponse.json(result);
}