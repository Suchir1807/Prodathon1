import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import HelpRequest from "@/models/HelpRequest";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const practice = await HelpRequest.findOne({
      requesterId: current._id,
      status: "completed",
      practiceSteps: { $exists: true, $ne: [] },
    }).sort({ updatedAt: -1 }).select("skill recap practiceSteps updatedAt").lean();
    return NextResponse.json({
      practice: practice ? {
        skill: practice.skill,
        recap: practice.recap,
        steps: practice.practiceSteps,
        date: practice.updatedAt.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error("Help Now practice GET error:", error);
    return NextResponse.json({ error: "Unable to load Today's practice." }, { status: 500 });
  }
}
