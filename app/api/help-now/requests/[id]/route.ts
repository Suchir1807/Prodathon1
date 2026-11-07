import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { offerNextHelpCandidate } from "@/lib/help-now/matching";
import { requireCurrentUser } from "@/lib/session-user";
import HelpOffer from "@/models/HelpOffer";
import HelpRequest from "@/models/HelpRequest";
import Session from "@/models/Session";
import User from "@/models/User";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Help Now request." }, { status: 400 });
  try {
    await connectDB();
    let helpRequest = await HelpRequest.findOne({ _id: id, requesterId: current._id }).lean();
    if (!helpRequest) return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
    if (helpRequest.status === "offered" && helpRequest.currentOfferId) {
      const offer = await HelpOffer.findById(helpRequest.currentOfferId).lean();
      if (offer?.status === "pending" && offer.expiresAt <= new Date()) {
        await offerNextHelpCandidate(helpRequest._id);
        helpRequest = await HelpRequest.findById(helpRequest._id).lean();
      }
    }
    const offer = helpRequest?.currentOfferId ? await HelpOffer.findById(helpRequest.currentOfferId).lean() : null;
    const helper = offer ? await User.findById(offer.helperId).select("username displayName").lean() : null;
    const appointment = helpRequest?.sessionId ? await Session.findById(helpRequest.sessionId).select("roomId").lean() : null;
    return NextResponse.json({
      request: {
        id: helpRequest?._id.toString(),
        category: helpRequest?.category,
        skill: helpRequest?.skill,
        difficulty: helpRequest?.difficulty,
        helperBrief: helpRequest?.helperBrief,
        searchTags: helpRequest?.searchTags,
        quickAnswer: helpRequest?.quickAnswer,
        status: helpRequest?.status,
        attempts: helpRequest?.attemptedCandidateIds.length ?? 0,
        candidateCount: helpRequest?.candidateIds.length ?? 0,
        currentHelper: helper ? {
          name: helper.displayName?.trim() || helper.username,
          offerExpiresAt: offer?.expiresAt.toISOString() ?? null,
        } : null,
        sessionId: helpRequest?.sessionId?.toString() ?? null,
        roomId: appointment?.roomId.toString() ?? null,
        recap: helpRequest?.recap ?? "",
        practiceSteps: helpRequest?.practiceSteps ?? [],
      },
    });
  } catch (error) {
    console.error("Help Now status error:", error);
    return NextResponse.json({ error: "Unable to load Help Now status." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Help Now request." }, { status: 400 });
  const connection = await connectDB();
  const transaction = await connection.startSession();
  let failure: "missing" | "matched" | null = null;
  try {
    await transaction.withTransaction(async () => {
      const helpRequest = await HelpRequest.findOne({ _id: id, requesterId: current._id }).session(transaction);
      if (!helpRequest) { failure = "missing"; return; }
      if (helpRequest.status === "matched" && helpRequest.sessionId) {
        failure = "matched";
        return;
      }
      if (["completed", "cancelled", "no_match"].includes(helpRequest.status)) return;
      if (helpRequest.currentOfferId) {
        await HelpOffer.updateOne(
          { _id: helpRequest.currentOfferId, status: "pending" },
          { $set: { status: "expired", respondedAt: new Date() } },
          { session: transaction },
        );
      }
      helpRequest.status = "cancelled";
      await helpRequest.save({ session: transaction });
      await User.updateOne({ _id: current._id }, { $inc: { helpNowCancelCount: 1 } }, { session: transaction });
    });
  } catch (error) {
    console.error("Help Now cancel error:", error);
    return NextResponse.json({ error: "Unable to cancel Help Now request." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Help Now request not found." }, { status: 404 });
  if (failure === "matched") return NextResponse.json({ error: "This Session has already started. Use the room controls to finish or report an issue." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
