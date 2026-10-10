import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { publicUserSummary, requireCurrentUser } from "@/lib/session-user";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const self = await User.findById(current._id).select("partnerId");
    if (!self?.partnerId) {
      return NextResponse.json({ matched: false });
    }

    const partner = await User.findById(self.partnerId).select(
      "username displayName skillsHave skillsLearn domainInterests",
    );
    if (!partner) {
      return NextResponse.json({ matched: false });
    }

    return NextResponse.json({
      matched: true,
      partner: publicUserSummary(partner),
    });
  } catch (error) {
    console.error("Partnership GET error:", error);
    return NextResponse.json({ error: "Unable to load partnership." }, { status: 500 });
  }
}
