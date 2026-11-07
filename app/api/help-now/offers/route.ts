import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { offerNextHelpCandidate } from "@/lib/help-now/matching";
import { requireCurrentUser } from "@/lib/session-user";
import HelpOffer from "@/models/HelpOffer";
import HelpRequest from "@/models/HelpRequest";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const offer = await HelpOffer.findOne({ helperId: current._id, status: "pending" }).sort({ createdAt: 1 }).lean();
    if (!offer) return NextResponse.json({ offer: null });
    if (offer.expiresAt <= new Date()) {
      await offerNextHelpCandidate(offer.requestId);
      return NextResponse.json({ offer: null });
    }
    const request = await HelpRequest.findById(offer.requestId).lean();
    const requester = request
      ? await User.findById(request.requesterId).select("displayName username").lean()
      : null;
    if (!request || !requester || request.status !== "offered" || request.currentOfferId?.toString() !== offer._id.toString()) {
      return NextResponse.json({ offer: null });
    }
    return NextResponse.json({
      offer: {
        id: offer._id.toString(),
        requestId: request._id.toString(),
        expiresAt: offer.expiresAt.toISOString(),
        category: request.category,
        skill: request.skill,
        difficulty: request.difficulty,
        helperBrief: request.helperBrief,
        durationMinutes: request.durationMinutes,
        requester: {
          name: requester.displayName?.trim() || requester.username,
        },
      },
    });
  } catch (error) {
    console.error("Help Now offers GET error:", error);
    return NextResponse.json({ error: "Unable to check incoming Help Now offers." }, { status: 500 });
  }
}
