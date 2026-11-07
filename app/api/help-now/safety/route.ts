import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { helpReportSchema } from "@/lib/validation/schemas";
import HelpRequest from "@/models/HelpRequest";
import HelpSafetyRecord from "@/models/HelpSafetyRecord";
import Session from "@/models/Session";

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = helpReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid report." }, { status: 400 });
  if (parsed.data.reportedUserId === current._id.toString()) return NextResponse.json({ error: "You cannot report or block yourself." }, { status: 400 });

  try {
    await connectDB();
    const helpRequest = await HelpRequest.findById(parsed.data.requestId).select("requesterId sessionId").lean();
    if (!helpRequest) return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
    const session = helpRequest.sessionId
      ? await Session.findOne({
          _id: helpRequest.sessionId,
          participants: current._id,
        }).select("participants").lean()
      : null;
    if (!session || !session.participants.some((member) => member.toString() === parsed.data.reportedUserId)) {
      return NextResponse.json({ error: "The reported member is not part of this Help Now Session." }, { status: 403 });
    }

    await HelpSafetyRecord.updateOne(
      {
        reporterId: current._id,
        reportedUserId: new mongoose.Types.ObjectId(parsed.data.reportedUserId),
        requestId: new mongoose.Types.ObjectId(parsed.data.requestId),
        kind: parsed.data.block ? "block" : "report",
      },
      {
        $setOnInsert: {
          reporterId: current._id,
          reportedUserId: new mongoose.Types.ObjectId(parsed.data.reportedUserId),
          requestId: new mongoose.Types.ObjectId(parsed.data.requestId),
          kind: parsed.data.block ? "block" : "report",
          reason: parsed.data.reason,
        },
      },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Help Now safety record error:", error);
    return NextResponse.json({ error: "Unable to submit this safety report." }, { status: 500 });
  }
}
