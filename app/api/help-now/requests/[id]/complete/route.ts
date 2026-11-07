import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { createPracticeRecap } from "@/lib/ai/help-now";
import { postCreditEntry } from "@/lib/credit-ledger";
import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import HelpRequest from "@/models/HelpRequest";
import Notification from "@/models/Notification";
import Session from "@/models/Session";
import SessionRoom from "@/models/SessionRoom";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Help Now request." }, { status: 400 });
  const connection = await connectDB();
  const transaction = await connection.startSession();
  let failure: "missing" | "inactive" | null = null;
  let completed = false;
  let sessionId = "";
  let notes = "";
  let problem = "";
  let brief = "";
  let participants: mongoose.Types.ObjectId[] = [];
  try {
    await transaction.withTransaction(async () => {
      const helpRequest = await HelpRequest.findById(id).session(transaction);
      if (!helpRequest?.sessionId) { failure = "missing"; return; }
      const appointment = await Session.findById(helpRequest.sessionId).session(transaction);
      if (!appointment || appointment.kind !== "help_now") { failure = "missing"; return; }
      if (!appointment.participants.some((participant) => participant.equals(current._id))) {
        failure = "missing";
        return;
      }
      if (appointment.status === "completed") {
        completed = true;
        sessionId = appointment._id.toString();
        return;
      }
      if (appointment.status !== "scheduled") { failure = "inactive"; return; }
      await Session.updateOne(
        { _id: appointment._id, status: "scheduled" },
        { $addToSet: { completionConfirmedBy: current._id } },
        { session: transaction },
      );
      const updated = await Session.findById(appointment._id).session(transaction);
      if (!updated) { failure = "missing"; return; }
      if (appointment.participants.every((participant) =>
        participant.equals(current._id) || updated.completionConfirmedBy.some((id) => id.equals(participant)),
      )) {
        updated.status = "completed";
        updated.completedAt = new Date();
        await updated.save({ session: transaction });
        const released = await postCreditEntry({
          userId: updated.teacherId,
          counterpartyId: updated.learnerId,
          sessionId: updated._id,
          amount: updated.durationMinutes,
          type: "session_release",
          idempotencyKey: `${updated._id}:release`,
          transaction,
        });
        if (!released.applied) throw new Error("Unable to release held Help Now credits.");
        helpRequest.status = "completed";
        await helpRequest.save({ session: transaction });
        await Notification.create(updated.participants.map((recipient) => ({
          recipient,
          sender: current._id,
          type: "session_completed",
          sessionId: updated._id,
          sessionRoomId: updated.roomId,
          helpRequestId: helpRequest._id,
          dedupeKey: `help-now-completed:${updated._id}:${recipient}`,
        })), { session: transaction });
        completed = true;
      }
      sessionId = updated._id.toString();
      const room = await SessionRoom.findById(updated.roomId).session(transaction);
      notes = room?.notes ?? "";
      problem = helpRequest.problem;
      brief = helpRequest.helperBrief;
      participants = updated.participants;
    });
  } catch (error) {
    console.error("Help Now completion error:", error);
    return NextResponse.json({ error: "Unable to confirm Session completion." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Help Now Session not found." }, { status: 404 });
  if (failure === "inactive") return NextResponse.json({ error: "This Session can no longer be completed." }, { status: 409 });
  if (completed) {
    const recap = await createPracticeRecap(problem, notes, brief);
    await HelpRequest.updateOne(
      { _id: id, status: "completed" },
      { $set: { recap: recap.recap, practiceSteps: recap.practiceSteps } },
    );
    return NextResponse.json({
      completed: true,
      sessionId,
      recap: recap.recap,
      practiceSteps: recap.practiceSteps,
      confirmedBy: participants.length,
    });
  }
  const currentSession = await Session.findById(sessionId).select("completionConfirmedBy").lean();
  return NextResponse.json({ completed: false, confirmedBy: currentSession?.completionConfirmedBy.length ?? 1 });
}
