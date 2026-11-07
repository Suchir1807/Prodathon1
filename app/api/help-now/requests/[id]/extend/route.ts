import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { postCreditEntry } from "@/lib/credit-ledger";
import { requireCurrentUser } from "@/lib/session-user";
import { helpExtendSchema } from "@/lib/validation/schemas";
import HelpRequest from "@/models/HelpRequest";
import Session from "@/models/Session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Help Now request." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = helpExtendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Learner consent is required to extend." }, { status: 400 });
  const connection = await connectDB();
  const transaction = await connection.startSession();
  let failure: "missing" | "not_learner" | "inactive" | "credits" | null = null;
  let durationMinutes = 0;
  try {
    await transaction.withTransaction(async () => {
      const helpRequest = await HelpRequest.findOne({ _id: id, requesterId: current._id, status: "matched" }).session(transaction);
      if (!helpRequest?.sessionId) { failure = "missing"; return; }
      const appointment = await Session.findOne({ _id: helpRequest.sessionId, kind: "help_now", status: "scheduled" }).session(transaction);
      if (!appointment) { failure = "inactive"; return; }
      if (!appointment.learnerId.equals(current._id)) { failure = "not_learner"; return; }
      const hold = await postCreditEntry({
        userId: current._id,
        counterpartyId: appointment.teacherId,
        sessionId: appointment._id,
        amount: -15,
        type: "session_hold",
        idempotencyKey: `${appointment._id}:extension:${appointment.durationMinutes}`,
        transaction,
      });
      if (!hold.applied) { failure = "credits"; return; }
      appointment.durationMinutes += 15;
      await appointment.save({ session: transaction });
      durationMinutes = appointment.durationMinutes;
    });
  } catch (error) {
    console.error("Help Now extension error:", error);
    return NextResponse.json({ error: "Unable to extend this Session." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
  if (failure === "not_learner") return NextResponse.json({ error: "Only the learner can consent to an extension." }, { status: 403 });
  if (failure === "inactive") return NextResponse.json({ error: "This Session can no longer be extended." }, { status: 409 });
  if (failure === "credits") return NextResponse.json({ error: "You need 15 available credits to extend." }, { status: 409 });
  return NextResponse.json({ durationMinutes });
}
