import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/session-user";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    await User.updateOne({ _id: current._id }, { $set: { lastSeen: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Availability heartbeat error:", error);
    return NextResponse.json({ error: "Unable to update presence." }, { status: 500 });
  }
}
