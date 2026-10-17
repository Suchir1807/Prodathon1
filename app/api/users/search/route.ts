import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ users: [] });

  try {
    await connectDB();
    const current = await User.findOne({ username }).select("_id").lean();
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const search = new RegExp(escapeRegex(query), "i");
    const users = await User.find({
      _id: { $ne: current._id },
      $or: [
        { username: search },
        { displayName: search },
        { skillsHave: search },
      ],
    })
      .select("username displayName skillsHave")
      .sort({ username: 1 })
      .limit(10)
    .lean<{
      _id: Types.ObjectId;
      username: string;
      displayName?: string;
      skillsHave?: string[];
    }[]>();

    return NextResponse.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName ?? "",
        skillsHave: user.skillsHave ?? [],
      })),
    });
  } catch (error) {
    console.error("User search GET error:", error);
    return NextResponse.json({ error: "Unable to search users." }, { status: 500 });
  }
}