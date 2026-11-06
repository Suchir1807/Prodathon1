import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { findAuthorizedExchange } from "@/lib/authorized-exchange";
import connectDB from "@/lib/mongodb";
import { exchangeUpdateSchema } from "@/lib/validation/schemas";
import Session from "@/models/Session";
import User from "@/models/User";
import Exchange from "@/models/Exchange";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await findAuthorizedExchange(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    await connectDB();
    const [members, sessions] = await Promise.all([
      User.find({ _id: { $in: access.exchange.members } })
        .select("_id username displayName skillsHave skillsLearn")
        .lean(),
      Session.find({ exchangeId: access.exchange._id }).sort({ startsAt: -1 }).limit(100).lean(),
    ]);
    return NextResponse.json({
      exchange: {
        id: access.exchange._id.toString(),
        status: access.exchange.status,
        cadence: access.exchange.cadence,
        weeklyGoal: access.exchange.weeklyGoal,
        members: members.map((member) => ({
          id: member._id.toString(),
          username: member.username,
          displayName: member.displayName?.trim() || member.username,
          skillsHave: member.skillsHave ?? [],
          skillsLearn: member.skillsLearn ?? [],
        })),
        sessions: sessions.map((session) => ({
          id: session._id.toString(),
          topic: session.topic,
          startsAt: session.startsAt.toISOString(),
          durationMinutes: session.durationMinutes,
          status: session.status,
          teacherId: session.teacherId.toString(),
          learnerId: session.learnerId.toString(),
          roomId: session.roomId.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Exchange GET error:", error);
    return NextResponse.json({ error: "Unable to load this Exchange." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await findAuthorizedExchange(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = exchangeUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Exchange update." }, { status: 400 });
  if (access.exchange.status === "ended" && parsed.data.status && parsed.data.status !== "ended") {
    return NextResponse.json({ error: "An ended Exchange cannot be reopened." }, { status: 409 });
  }

  try {
    await connectDB();
    const updated = await Exchange.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), members: access.current._id, status: { $ne: "ended" } },
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: "This Exchange is no longer active." }, { status: 409 });
    return NextResponse.json({ exchange: { id: updated._id.toString(), status: updated.status, weeklyGoal: updated.weeklyGoal } });
  } catch (error) {
    console.error("Exchange PATCH error:", error);
    return NextResponse.json({ error: "Unable to update this Exchange." }, { status: 500 });
  }
}
