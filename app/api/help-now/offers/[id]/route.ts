import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { postCreditEntry } from "@/lib/credit-ledger";
import { offerNextHelpCandidate } from "@/lib/help-now/matching";
import { requireCurrentUser } from "@/lib/session-user";
import { helpOfferResponseSchema } from "@/lib/validation/schemas";
import HelpOffer from "@/models/HelpOffer";
import HelpRequest from "@/models/HelpRequest";
import Notification from "@/models/Notification";
import Session from "@/models/Session";
import SessionRoom from "@/models/SessionRoom";
import { ensureCreditAccount } from "@/lib/credit-balance";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid offer." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = helpOfferResponseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid offer response." }, { status: 400 });

  await connectDB();
  const offerDetails = await HelpOffer.findOne({ _id: id, helperId: current._id, status: "pending" }).lean();
  if (!offerDetails) return NextResponse.json({ error: "This offer is no longer available." }, { status: 404 });
  if (parsed.data.action === "accept") {
    const target = await HelpRequest.findById(offerDetails.requestId).select("requesterId").lean();
    if (!target) return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
    try {
      await ensureCreditAccount(target.requesterId);
    } catch (error) {
      console.error("Help Now credit account initialization error:", error);
      return NextResponse.json({ error: "Unable to reserve the learner's credits." }, { status: 500 });
    }
  }

  const connection = await connectDB();
  const transaction = await connection.startSession();
  let failure: "expired" | "stale" | "credits" | "missing" | null = null;
  let roomId = "";
  let sessionId = "";
  try {
    await transaction.withTransaction(async () => {
      const offer = await HelpOffer.findOne({ _id: id, helperId: current._id, status: "pending" }).session(transaction);
      if (!offer) { failure = "stale"; return; }
      const helpRequest = await HelpRequest.findById(offer.requestId).session(transaction);
      if (!helpRequest) { failure = "missing"; return; }
      if (offer.expiresAt <= new Date()) {
        offer.status = "expired";
        offer.respondedAt = new Date();
        await offer.save({ session: transaction });
        helpRequest.status = "searching";
        helpRequest.currentOfferId = null;
        await helpRequest.save({ session: transaction });
        failure = "expired";
        return;
      }
      if (helpRequest.status !== "offered" || !helpRequest.currentOfferId?.equals(offer._id)) {
        failure = "stale";
        return;
      }

      offer.respondedAt = new Date();
      if (parsed.data.action === "decline") {
        offer.status = "declined";
        await offer.save({ session: transaction });
        helpRequest.status = "searching";
        helpRequest.currentOfferId = null;
        await helpRequest.save({ session: transaction });
        return;
      }

      const sessionObjectId = new mongoose.Types.ObjectId();
      const roomObjectId = new mongoose.Types.ObjectId();
      const held = await postCreditEntry({
        userId: helpRequest.requesterId,
        counterpartyId: current._id,
        sessionId: sessionObjectId,
        amount: -helpRequest.durationMinutes,
        type: "session_hold",
        idempotencyKey: `${helpRequest._id}:hold`,
        transaction,
      });
      if (!held.applied) { failure = "credits"; return; }

      const participants = [helpRequest.requesterId, current._id];
      await SessionRoom.create([{
        _id: roomObjectId,
        sessionId: sessionObjectId,
        exchangeId: null,
        members: participants,
        notes: "",
      }], { session: transaction });
      await Session.create([{
        _id: sessionObjectId,
        exchangeId: null,
        kind: "help_now",
        helpRequestId: helpRequest._id,
        participants,
        teacherId: current._id,
        learnerId: helpRequest.requesterId,
        topic: helpRequest.skill,
        startsAt: new Date(),
        durationMinutes: helpRequest.durationMinutes,
        status: "scheduled",
        roomId: roomObjectId,
        idempotencyKey: `helpnow:${helpRequest._id}`,
        createdBy: helpRequest.requesterId,
        completionConfirmedBy: [],
        aiBrief: helpRequest.helperBrief,
        jitsiUrl: `https://meet.jit.si/skillin-${sessionObjectId.toString()}`,
      }], { session: transaction });
      offer.status = "accepted";
      await offer.save({ session: transaction });
      helpRequest.status = "matched";
      helpRequest.currentOfferId = offer._id;
      helpRequest.sessionId = sessionObjectId;
      await helpRequest.save({ session: transaction });
      await Notification.create(participants.map((recipient) => ({
        recipient,
        sender: current._id,
        type: "session_booked",
        sessionId: sessionObjectId,
        sessionRoomId: roomObjectId,
        helpRequestId: helpRequest._id,
        dedupeKey: `help-now-matched:${sessionObjectId}:${recipient}`,
      })), { session: transaction });
      roomId = roomObjectId.toString();
      sessionId = sessionObjectId.toString();
    });
  } catch (error) {
    console.error("Help Now offer response error:", error);
    return NextResponse.json({ error: "Unable to respond to this offer." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
  if (failure === "credits") return NextResponse.json({ error: "The learner does not have enough credits for this Session." }, { status: 409 });
  if (failure === "expired" || failure === "stale") {
    if (failure === "expired") await offerNextHelpCandidate(offerDetails.requestId);
    return NextResponse.json({ error: "This offer is no longer available." }, { status: 409 });
  }
  if (parsed.data.action === "decline") await offerNextHelpCandidate(offerDetails.requestId);
  return NextResponse.json({
    accepted: parsed.data.action === "accept",
    sessionId: sessionId || null,
    roomId: roomId || null,
    roomUrl: roomId ? `/session-room/${roomId}` : null,
  });
}
