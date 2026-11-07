import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { ensureCreditAccount, getCreditBalance } from "@/lib/credit-balance";
import { requireCurrentUser } from "@/lib/session-user";
import { sessionBookingSchema } from "@/lib/validation/schemas";
import CreditAccount from "@/models/CreditAccount";
import Exchange from "@/models/Exchange";
import Notification from "@/models/Notification";
import Session from "@/models/Session";
import SessionReview from "@/models/SessionReview";
import SessionRoom from "@/models/SessionRoom";
import User from "@/models/User";
import { postCreditEntry } from "@/lib/credit-ledger";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!current.isProfileComplete || !current.skillsHave.length) {
    return NextResponse.json({ error: "Complete your skills profile first.", redirectTo: "/onboarding" }, { status: 409 });
  }
  try {
    await connectDB();
    await ensureCreditAccount(current._id);
    const sessions = await Session.find({ participants: current._id }).sort({ startsAt: -1 }).limit(100).lean();
    const sessionIds = sessions.map((session) => session._id);
    const [users, reviews, balance] = await Promise.all([
      User.find({ _id: { $in: [...new Set(sessions.flatMap((session) => session.participants.map((id) => id.toString())))] } })
        .select("_id username displayName")
        .lean(),
      SessionReview.find({ sessionId: { $in: sessionIds } }).lean(),
      getCreditBalance(current._id),
    ]);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const reviewsBySession = new Map<string, typeof reviews>();
    for (const review of reviews) {
      const key = review.sessionId.toString();
      reviewsBySession.set(key, [...(reviewsBySession.get(key) ?? []), review]);
    }

    return NextResponse.json({
      balance,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        exchangeId: session.exchangeId?.toString() ?? null,
        kind: session.kind,
        helpRequestId: session.helpRequestId?.toString() ?? null,
        topic: session.topic,
        startsAt: session.startsAt.toISOString(),
        durationMinutes: session.durationMinutes,
        status: session.status,
        teacherId: session.teacherId.toString(),
        learnerId: session.learnerId.toString(),
        roomId: session.roomId.toString(),
        aiBrief: session.aiBrief,
        jitsiUrl: session.jitsiUrl,
        completionConfirmedBy: session.completionConfirmedBy.map((id) => id.toString()),
        partner: (() => {
          const partnerId = session.participants.find((id) => !id.equals(current._id))?.toString();
          const partner = partnerId ? usersById.get(partnerId) : null;
          return partner ? {
            id: partner._id.toString(),
            username: partner.username,
            displayName: partner.displayName?.trim() || partner.username,
          } : null;
        })(),
        reviews: (reviewsBySession.get(session._id.toString()) ?? []).map((review) => ({
          id: review._id.toString(),
          reviewerId: review.reviewerId.toString(),
          recipientId: review.recipientId.toString(),
          rating: review.rating,
          feedback: review.feedback,
          skills: review.skills,
        })),
      })),
    });
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json({ error: "Unable to load your Sessions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!current.isProfileComplete || !current.skillsHave.length) {
    return NextResponse.json({ error: "Complete your skills profile first.", redirectTo: "/onboarding" }, { status: 409 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = sessionBookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Session details." }, { status: 400 });
  const startsAt = new Date(parsed.data.startsAt);
  if (startsAt.getTime() < Date.now() + 5 * 60_000 || startsAt.getTime() > Date.now() + 90 * 86_400_000) {
    return NextResponse.json({ error: "Choose a time at least five minutes from now and within the next 90 days." }, { status: 400 });
  }

  const connection = await connectDB();
  const teacherId = new mongoose.Types.ObjectId(parsed.data.teacherId);
  const activeExchange = await Exchange.findOne({
    _id: parsed.data.exchangeId,
    members: current._id,
    status: "active",
  }).lean();
  if (!activeExchange) return NextResponse.json({ error: "Active Exchange not found." }, { status: 404 });
  if (!activeExchange.members.some((member) => member.equals(teacherId)) || teacherId.equals(current._id)) {
    return NextResponse.json({ error: "Choose your Exchange partner as the teacher." }, { status: 400 });
  }
  try {
    await Promise.all([ensureCreditAccount(current._id), ensureCreditAccount(teacherId)]);
  } catch (error) {
    console.error("Credit account initialization error:", error);
    return NextResponse.json({ error: "Unable to initialize the Session credit accounts." }, { status: 500 });
  }
  const transaction = await connection.startSession();
  let created: { id: string; roomId: string; startsAt: string; topic: string; durationMinutes: number } | null = null;
  let failure: "exchange" | "teacher" | "credits" | "conflict" | null = null;
  try {
    await transaction.withTransaction(async () => {
      const existing = await Session.findOne({
        createdBy: current._id,
        idempotencyKey: parsed.data.idempotencyKey,
      }).session(transaction);
      if (existing) {
        created = {
          id: existing._id.toString(),
          roomId: existing.roomId.toString(),
          startsAt: existing.startsAt.toISOString(),
          topic: existing.topic,
          durationMinutes: existing.durationMinutes,
        };
        return;
      }

      const exchange = await Exchange.findOne({
        _id: parsed.data.exchangeId,
        members: current._id,
        status: "active",
      }).session(transaction);
      if (!exchange) { failure = "exchange"; return; }
      const learnerIsMember = exchange.members.some((member) => member.equals(current._id));
      const teacherIsMember = exchange.members.some((member) => member.equals(teacherId));
      if (!learnerIsMember || !teacherIsMember || teacherId.equals(current._id)) {
        failure = "teacher";
        return;
      }

      const account = await CreditAccount.findOne({ userId: current._id }).session(transaction);
      if (!account || account.balance < parsed.data.durationMinutes) {
        failure = "credits";
        return;
      }

      const nearby = await Session.find({
        status: "scheduled",
        participants: { $in: exchange.members },
        startsAt: {
          $gte: new Date(startsAt.getTime() - 180 * 60_000),
          $lte: new Date(startsAt.getTime() + 180 * 60_000),
        },
      }).session(transaction).lean();
      const proposedEnd = startsAt.getTime() + parsed.data.durationMinutes * 60_000;
      if (nearby.some((appointment) => {
        const existingStart = appointment.startsAt.getTime();
        const existingEnd = existingStart + appointment.durationMinutes * 60_000;
        return startsAt.getTime() < existingEnd && existingStart < proposedEnd;
      })) {
        failure = "conflict";
        return;
      }

      const sessionId = new mongoose.Types.ObjectId();
      const roomId = new mongoose.Types.ObjectId();
      const reserved = await postCreditEntry({
        userId: current._id,
        counterpartyId: teacherId,
        sessionId,
        amount: -parsed.data.durationMinutes,
        type: "session_spent",
        idempotencyKey: `${sessionId}:spent`,
        transaction,
      });
      if (!reserved.applied) { failure = "credits"; return; }
      await SessionRoom.create([{
        _id: roomId,
        sessionId,
        exchangeId: exchange._id,
        members: exchange.members,
        notes: "",
      }], { session: transaction });
      const [appointment] = await Session.create([{
        _id: sessionId,
        exchangeId: exchange._id,
        kind: "scheduled",
        participants: exchange.members,
        teacherId,
        learnerId: current._id,
        topic: parsed.data.topic,
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        status: "scheduled",
        roomId,
        idempotencyKey: parsed.data.idempotencyKey,
        createdBy: current._id,
      }], { session: transaction });
      await Notification.create([{
        recipient: teacherId,
        sender: current._id,
        type: "session_booked",
        exchangeId: exchange._id,
        sessionId,
        sessionRoomId: roomId,
        dedupeKey: `session-booked:${sessionId}`,
      }], { session: transaction });
      created = {
        id: appointment._id.toString(),
        roomId: roomId.toString(),
        startsAt: appointment.startsAt.toISOString(),
        topic: appointment.topic,
        durationMinutes: appointment.durationMinutes,
      };
    });
  } catch (error) {
    console.error("Session booking error:", error);
    return NextResponse.json({ error: "Unable to book this Session." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (failure === "exchange") return NextResponse.json({ error: "Active Exchange not found." }, { status: 404 });
  if (failure === "teacher") return NextResponse.json({ error: "Choose your Exchange partner as the teacher." }, { status: 400 });
  if (failure === "credits") return NextResponse.json({ error: "Not enough time credits for this Session." }, { status: 409 });
  if (failure === "conflict") return NextResponse.json({ error: "One of you already has a Session at that time." }, { status: 409 });
  if (!created) return NextResponse.json({ error: "Unable to book this Session." }, { status: 500 });
  return NextResponse.json({ session: created }, { status: 201 });
}
