import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { sessionStatusSchema } from "@/lib/validation/schemas";
import { postCreditEntry } from "@/lib/credit-ledger";
import HelpRequest from "@/models/HelpRequest";
import Notification from "@/models/Notification";
import Session from "@/models/Session";
import SessionReview from "@/models/SessionReview";
import SessionRoom from "@/models/SessionRoom";
import User from "@/models/User";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Session." }, { status: 400 });
  try {
    await connectDB();
    const appointment = await Session.findOne({ _id: id, participants: current._id }).lean();
    if (!appointment) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    const [members, room, reviews] = await Promise.all([
      User.find({ _id: { $in: appointment.participants } }).select("_id username displayName skillsHave skillsLearn").lean(),
      SessionRoom.findOne({ _id: appointment.roomId, members: current._id }).lean(),
      SessionReview.find({ sessionId: appointment._id }).sort({ createdAt: 1 }).lean(),
    ]);
    return NextResponse.json({
      session: {
        id: appointment._id.toString(),
        exchangeId: appointment.exchangeId?.toString() ?? null,
        kind: appointment.kind,
        helpRequestId: appointment.helpRequestId?.toString() ?? null,
        topic: appointment.topic,
        startsAt: appointment.startsAt.toISOString(),
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        teacherId: appointment.teacherId.toString(),
        learnerId: appointment.learnerId.toString(),
        roomId: appointment.roomId.toString(),
        aiBrief: appointment.aiBrief,
        jitsiUrl: appointment.jitsiUrl,
        completionConfirmedBy: appointment.completionConfirmedBy.map((id) => id.toString()),
        members: members.map((member) => ({
          id: member._id.toString(),
          username: member.username,
          displayName: member.displayName?.trim() || member.username,
          skillsHave: member.skillsHave ?? [],
          skillsLearn: member.skillsLearn ?? [],
        })),
        room: room ? {
          notes: room.notes,
          revision: room.notesRevision,
          updatedAt: room.updatedAt.toISOString(),
          lastEditedBy: room.lastEditedBy?.toString() ?? null,
        } : null,
        reviews: reviews.map((review) => ({
          id: review._id.toString(),
          reviewerId: review.reviewerId.toString(),
          recipientId: review.recipientId.toString(),
          rating: review.rating,
          feedback: review.feedback,
          skills: review.skills,
          createdAt: review.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json({ error: "Unable to load this Session." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = sessionStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Session status." }, { status: 400 });

  const connection = await connectDB();
  const transaction = await connection.startSession();
  let outcome: "updated" | "already_done" | "missing" | "not_ready" | "terminal" | "help_now_requires_both" | null = null;
  try {
    await transaction.withTransaction(async () => {
      const appointment = await Session.findOne({ _id: id, participants: current._id }).session(transaction);
      if (!appointment) { outcome = "missing"; return; }
      if (appointment.status === parsed.data.status) { outcome = "already_done"; return; }
      if (appointment.status !== "scheduled") { outcome = "terminal"; return; }
      if (appointment.kind === "help_now" && parsed.data.status === "completed") {
        outcome = "help_now_requires_both";
        return;
      }
      if (parsed.data.status === "completed" && appointment.startsAt.getTime() > Date.now()) {
        outcome = "not_ready";
        return;
      }

      appointment.status = parsed.data.status;
      appointment.completedAt = parsed.data.status === "completed" ? new Date() : null;
      await appointment.save({ session: transaction });

      if (parsed.data.status === "completed") {
        const credit = await postCreditEntry({
          userId: appointment.teacherId,
          counterpartyId: appointment.learnerId,
          sessionId: appointment._id,
          amount: appointment.durationMinutes,
          type: "session_earned",
          idempotencyKey: `${appointment._id}:earned`,
          transaction,
        });
        if (!credit.applied) throw new Error("Unable to record Session credits.");
        await Notification.create(appointment.participants.map((recipient) => ({
          recipient,
          sender: current._id,
          type: "session_completed",
          ...(appointment.exchangeId ? { exchangeId: appointment.exchangeId } : {}),
          sessionId: appointment._id,
          sessionRoomId: appointment.roomId,
          dedupeKey: `session-completed:${appointment._id}:${recipient}`,
        })), { session: transaction });
      } else {
        const refund = await postCreditEntry({
          userId: appointment.learnerId,
          counterpartyId: appointment.teacherId,
          sessionId: appointment._id,
          amount: appointment.durationMinutes,
          type: "session_refund",
          idempotencyKey: `${appointment._id}:refund`,
          transaction,
        });
        if (!refund.applied) throw new Error("Unable to refund Session credits.");
        if (appointment.kind === "help_now" && appointment.helpRequestId) {
          await HelpRequest.updateOne(
            { _id: appointment.helpRequestId, status: "matched" },
            { $set: { status: "cancelled" } },
            { session: transaction },
          );
          await User.updateOne({ _id: appointment.learnerId }, { $inc: { helpNowCancelCount: 1 } }, { session: transaction });
        }
      }
      outcome = "updated";
    });
  } catch (error) {
    console.error("Session update error:", error);
    return NextResponse.json({ error: "Unable to update this Session." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (outcome === "missing") return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (outcome === "not_ready") return NextResponse.json({ error: "A Session can be completed once its scheduled time begins." }, { status: 409 });
  if (outcome === "help_now_requires_both") return NextResponse.json({ error: "Both people must confirm completion in the Help Now room." }, { status: 409 });
  if (outcome === "terminal") return NextResponse.json({ error: "This Session can no longer be changed." }, { status: 409 });
  if (!outcome) return NextResponse.json({ error: "Unable to update this Session." }, { status: 500 });
  return NextResponse.json({ status: parsed.data.status, idempotent: outcome === "already_done" });
}
