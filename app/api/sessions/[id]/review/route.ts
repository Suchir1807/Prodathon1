import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { sessionReviewSchema } from "@/lib/validation/schemas";
import Notification from "@/models/Notification";
import Session from "@/models/Session";
import SessionReview from "@/models/SessionReview";
import SkillBadge from "@/models/SkillBadge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Session." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = sessionReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });

  try {
    await connectDB();
    const appointment = await Session.findOne({ _id: id, participants: current._id }).lean();
    if (!appointment) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    if (appointment.status !== "completed") return NextResponse.json({ error: "Review after the Session is completed." }, { status: 409 });
    const recipientId = appointment.participants.find((participant) => !participant.equals(current._id));
    if (!recipientId) return NextResponse.json({ error: "Session partner not found." }, { status: 404 });
    const existing = await SessionReview.findOne({ sessionId: appointment._id, reviewerId: current._id }).lean();
    if (existing) return NextResponse.json({ reviewId: existing._id.toString(), idempotent: true });

    const review = await SessionReview.create({
      sessionId: appointment._id,
      reviewerId: current._id,
      recipientId,
      rating: parsed.data.rating,
      feedback: parsed.data.feedback,
      skills: parsed.data.skills,
    });
    if (parsed.data.skills.length) {
      await SkillBadge.insertMany(parsed.data.skills.map((skill) => ({
        userId: recipientId,
        sessionId: appointment._id,
        reviewId: review._id,
        skill,
      })), { ordered: false });
    }
    await Notification.create({
      recipient: recipientId,
      sender: current._id,
      type: "session_review",
      ...(appointment.exchangeId ? { exchangeId: appointment.exchangeId } : {}),
      sessionId: appointment._id,
      sessionRoomId: appointment.roomId,
      dedupeKey: `session-review:${review._id}`,
    });
    return NextResponse.json({ reviewId: review._id.toString() }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const existing = await SessionReview.findOne({ sessionId: id, reviewerId: current._id }).select("_id").lean();
      if (existing) return NextResponse.json({ reviewId: existing._id.toString(), idempotent: true });
    }
    console.error("Session review error:", error);
    return NextResponse.json({ error: "Unable to save this review." }, { status: 500 });
  }
}
