import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Ask from "@/models/Ask";
import Exchange from "@/models/Exchange";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!current.isProfileComplete || !current.skillsHave.length) {
    return NextResponse.json({ error: "Complete your skills profile first.", redirectTo: "/onboarding" }, { status: 409 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Ask." }, { status: 400 });

  const connection = await connectDB();
  const session = await connection.startSession();
  let exchangeId = "";
  let authorId = "";
  let failure: "missing" | "self" | "closed" | null = null;
  try {
    await session.withTransaction(async () => {
      const ask = await Ask.findOne({ _id: id }).session(session);
      if (!ask) { failure = "missing"; return; }
      if (ask.authorId.equals(current._id)) { failure = "self"; return; }
      if (ask.status !== "open") {
        const existing = await Exchange.findOne({ originAskId: ask._id }).session(session);
        if (existing) { exchangeId = existing._id.toString(); authorId = ask.authorId.toString(); return; }
        failure = "closed";
        return;
      }

      const claimed = await Ask.findOneAndUpdate(
        { _id: ask._id, status: "open" },
        { $set: { status: "matched", matchedWith: current._id } },
        { new: true, session },
      );
      if (!claimed) { failure = "closed"; return; }
      const [exchange] = await Exchange.create([{
        members: [ask.authorId, current._id],
        weeklyGoal: ask.note,
        createdBy: current._id,
        originAskId: ask._id,
        inviteId: null,
      }], { session });
      exchangeId = exchange._id.toString();
      authorId = ask.authorId.toString();
      await Notification.create([{
        recipient: ask.authorId,
        sender: current._id,
        type: "ask_matched",
        exchangeId: exchange._id,
        askId: ask._id,
        dedupeKey: `ask-matched:${ask._id}`,
      }], { session });
    });
  } catch (error) {
    console.error("Ask acceptance error:", error);
    return NextResponse.json({ error: "Unable to accept this Ask." }, { status: 500 });
  } finally {
    await session.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Ask not found." }, { status: 404 });
  if (failure === "self") return NextResponse.json({ error: "You cannot accept your own Ask." }, { status: 400 });
  if (failure || !exchangeId) return NextResponse.json({ error: "This Ask is no longer open." }, { status: 409 });

  const partner = await User.findById(authorId).select("displayName username").lean();
  return NextResponse.json({ exchangeId, partnerName: partner?.displayName?.trim() || partner?.username || "Your partner" });
}
