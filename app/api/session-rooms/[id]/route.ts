import { NextResponse } from "next/server";

import { findAuthorizedSessionRoom } from "@/lib/authorized-session-room";
import connectDB from "@/lib/mongodb";
import { sessionRoomUpdateSchema } from "@/lib/validation/schemas";
import Session from "@/models/Session";
import SessionRoom from "@/models/SessionRoom";
import HelpRequest from "@/models/HelpRequest";
import SessionReview from "@/models/SessionReview";
import User from "@/models/User";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await findAuthorizedSessionRoom(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    await connectDB();
    const [appointment, members] = await Promise.all([
      Session.findOne({ _id: access.room.sessionId, participants: access.current._id }).lean(),
      User.find({ _id: { $in: access.room.members } }).select("_id username displayName").lean(),
    ]);
    if (!appointment) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    const [helpRequest, reviews] = appointment.helpRequestId
      ? await Promise.all([
          HelpRequest.findById(appointment.helpRequestId).select("recap practiceSteps").lean(),
          SessionReview.find({ sessionId: appointment._id }).select("reviewerId").lean(),
        ])
      : [null, await SessionReview.find({ sessionId: appointment._id }).select("reviewerId").lean()];
    return NextResponse.json({
      room: {
        id: access.room._id.toString(),
        sessionId: appointment._id.toString(),
        exchangeId: access.room.exchangeId?.toString() ?? null,
        kind: appointment.kind,
        helpRequestId: appointment.helpRequestId?.toString() ?? null,
        topic: appointment.topic,
        startsAt: appointment.startsAt.toISOString(),
        durationMinutes: appointment.durationMinutes,
        learnerId: appointment.learnerId.toString(),
        teacherId: appointment.teacherId.toString(),
        sessionStatus: appointment.status,
        aiBrief: appointment.aiBrief,
        jitsiUrl: appointment.jitsiUrl,
        completionConfirmedBy: appointment.completionConfirmedBy.map((userId) => userId.toString()),
        recap: helpRequest?.recap ?? "",
        practiceSteps: helpRequest?.practiceSteps ?? [],
        reviewedBy: reviews.map((review) => review.reviewerId.toString()),
        notes: access.room.notes,
        revision: access.room.notesRevision,
        updatedAt: access.room.updatedAt.toISOString(),
        lastEditedBy: access.room.lastEditedBy?.toString() ?? null,
        members: members.map((member) => ({
          id: member._id.toString(),
          username: member.username,
          displayName: member.displayName?.trim() || member.username,
        })),
      },
    });
  } catch (error) {
    console.error("SessionRoom GET error:", error);
    return NextResponse.json({ error: "Unable to load this SessionRoom." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await findAuthorizedSessionRoom(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = sessionRoomUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid SessionRoom notes." }, { status: 400 });

  try {
    await connectDB();
    const updated = await SessionRoom.findOneAndUpdate(
      { _id: access.room._id, members: access.current._id, notesRevision: parsed.data.expectedRevision },
      {
        $set: { notes: parsed.data.notes, lastEditedBy: access.current._id },
        $inc: { notesRevision: 1 },
      },
      { new: true, runValidators: true },
    ).lean();
    if (!updated) {
      const current = await SessionRoom.findById(access.room._id)
        .select("notes notesRevision updatedAt lastEditedBy")
        .lean();
      return NextResponse.json({
        error: "Your partner updated the notes. Load the latest version before saving.",
        current: current ? {
          notes: current.notes,
          revision: current.notesRevision,
          updatedAt: current.updatedAt.toISOString(),
          lastEditedBy: current.lastEditedBy?.toString() ?? null,
        } : null,
      }, { status: 409 });
    }
    return NextResponse.json({
      notes: updated.notes,
      revision: updated.notesRevision,
      updatedAt: updated.updatedAt.toISOString(),
      lastEditedBy: updated.lastEditedBy?.toString() ?? null,
    });
  } catch (error) {
    console.error("SessionRoom PUT error:", error);
    return NextResponse.json({ error: "Unable to save SessionRoom notes." }, { status: 500 });
  }
}
