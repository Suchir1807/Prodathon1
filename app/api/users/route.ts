import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const current = await User.findOne({ username }).select("_id");
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const users = await User.find({ _id: { $ne: current._id } })
      .select("username displayName skillsHave skillsLearn domainInterests")
      .sort({ username: 1 })
      .lean();

    return NextResponse.json(
      users.map((user) => ({
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName ?? "",
        skillsHave: user.skillsHave ?? [],
        skillsLearn: user.skillsLearn ?? [],
        domainInterests: user.domainInterests ?? [],
      })),
    );
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}
