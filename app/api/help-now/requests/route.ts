import { NextResponse } from "next/server";

import { quickAnswer, triageHelpRequest } from "@/lib/ai/help-now";
import connectDB from "@/lib/mongodb";
import { rankHelpCandidates, offerNextHelpCandidate } from "@/lib/help-now/matching";
import { requireCurrentUser } from "@/lib/session-user";
import { helpNowRequestSchema } from "@/lib/validation/schemas";
import HelpRequest from "@/models/HelpRequest";
import User from "@/models/User";

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = helpNowRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Help Now request." }, { status: 400 });

  try {
    await connectDB();
    const now = new Date();
    const [requestCount, requester] = await Promise.all([
      HelpRequest.countDocuments({
        requesterId: current._id,
        createdAt: { $gte: new Date(now.getTime() - 15 * 60_000) },
      }),
      User.findById(current._id).select("helpNowCancelCount skillsHave").lean(),
    ]);
    if (requestCount >= 3) return NextResponse.json({ error: "Please wait before starting another Help Now request." }, { status: 429 });
    if ((requester?.helpNowCancelCount ?? 0) >= 3) {
      return NextResponse.json({ error: "Help Now is paused for your account after repeated cancellations. Contact support to restore access." }, { status: 403 });
    }

    const triage = await triageHelpRequest(parsed.data.problem);
    const answer = await quickAnswer(parsed.data.problem, triage);
    const candidateIds = await rankHelpCandidates(current._id, triage);
    const [helpRequest] = await HelpRequest.create([{
      requesterId: current._id,
      problem: parsed.data.problem,
      urgency: parsed.data.urgency,
      durationMinutes: parsed.data.durationMinutes,
      category: triage.category,
      skill: triage.skill,
      difficulty: triage.difficulty,
      helperBrief: triage.brief,
      searchTags: triage.tags,
      quickAnswer: answer,
      candidateIds,
      attemptedCandidateIds: [],
    }]);
    await offerNextHelpCandidate(helpRequest._id);
    const refreshed = await HelpRequest.findById(helpRequest._id).lean();
    return NextResponse.json({
      request: refreshed ? serializeRequest(refreshed) : serializeRequest(helpRequest.toObject()),
      candidateCount: candidateIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error("Help Now request error:", error);
    return NextResponse.json({ error: "Unable to start Help Now. Please try again." }, { status: 500 });
  }
}

function serializeRequest(request: {
  _id: { toString(): string };
  category: string;
  skill: string;
  difficulty: string;
  helperBrief: string;
  searchTags: string[];
  quickAnswer: string;
  status: string;
  candidateIds: { toString(): string }[];
  durationMinutes: number;
  attemptedCandidateIds: { toString(): string }[];
  sessionId?: { toString(): string } | null;
}) {
  return {
    id: request._id.toString(),
    category: request.category,
    skill: request.skill,
    difficulty: request.difficulty,
    helperBrief: request.helperBrief,
    searchTags: request.searchTags,
    quickAnswer: request.quickAnswer,
    status: request.status,
    durationMinutes: request.durationMinutes,
    attempts: request.attemptedCandidateIds.length,
    candidateCount: request.candidateIds.length,
    sessionId: request.sessionId?.toString() ?? null,
    currentHelper: null,
    roomId: null,
  };
}
