import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import User from "@/models/User";

export async function GET(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const tokens = [...new Set((query.toLocaleLowerCase().match(/[a-z0-9+#.]{3,}/g) ?? []).slice(0, 8))];
  if (!tokens.length) return NextResponse.json({ count: 0 });
  try {
    await connectDB();
    const now = new Date();
    const count = await User.countDocuments({
      _id: { $ne: current._id },
      availableUntil: { $gt: now },
      $or: tokens.flatMap((token) => {
        const matcher = new RegExp(escapeRegex(token), "i");
        return [{ skillsHave: matcher }, { availableFor: matcher }];
      }),
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Help Now online count error:", error);
    return NextResponse.json({ error: "Unable to check helper availability." }, { status: 500 });
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
