import { Types } from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Exchange from "@/models/Exchange";
import Session from "@/models/Session";

type PopulatedMember = { _id: Types.ObjectId; username: string; displayName?: string; skillsHave?: string[] };

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!current.isProfileComplete || !current.skillsHave.length) {
    return NextResponse.json({ error: "Complete your skills profile first.", redirectTo: "/onboarding" }, { status: 409 });
  }
  try {
    await connectDB();
    const exchanges = await Exchange.find({ members: current._id })
      .sort({ updatedAt: -1 })
      .populate<{ members: PopulatedMember[] }>("members", "username displayName skillsHave")
      .lean();
    const sessions = await Session.find({
      participants: current._id,
      status: "scheduled",
      startsAt: { $gte: new Date() },
    }).sort({ startsAt: 1 }).limit(50).lean();
    const sessionsByExchange = new Map<string, typeof sessions>();
    for (const appointment of sessions) {
      const key = appointment.exchangeId.toString();
      sessionsByExchange.set(key, [...(sessionsByExchange.get(key) ?? []), appointment]);
    }

    return NextResponse.json({
      exchanges: exchanges.map((exchange) => ({
        id: exchange._id.toString(),
        status: exchange.status,
        cadence: exchange.cadence,
        weeklyGoal: exchange.weeklyGoal,
        createdAt: exchange.createdAt.toISOString(),
        members: exchange.members.map((member) => ({
          id: member._id.toString(),
          username: member.username,
          displayName: member.displayName?.trim() || member.username,
          skillsHave: member.skillsHave ?? [],
        })),
        upcomingSessions: (sessionsByExchange.get(exchange._id.toString()) ?? []).map((appointment) => ({
          id: appointment._id.toString(),
          topic: appointment.topic,
          startsAt: appointment.startsAt.toISOString(),
          durationMinutes: appointment.durationMinutes,
          roomId: appointment.roomId.toString(),
        })),
      })),
    });
  } catch (error) {
    console.error("Exchanges GET error:", error);
    return NextResponse.json({ error: "Unable to load your Exchanges." }, { status: 500 });
  }
}
