import mongoose from "mongoose";
import { Types } from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { exchangeInviteResponseSchema, exchangeInviteSchema } from "@/lib/validation/schemas";
import Exchange from "@/models/Exchange";
import ExchangeInvite from "@/models/ExchangeInvite";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const [received, sent] = await Promise.all([
      ExchangeInvite.find({ recipient: current._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("sender", "username displayName skillsHave skillsLearn")
        .lean(),
      ExchangeInvite.find({ sender: current._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("recipient", "username displayName skillsHave skillsLearn")
        .lean(),
    ]);
    const summary = (user: unknown) => {
      if (!user || typeof user !== "object" || !("_id" in user)) return null;
      const person = user as { _id: Types.ObjectId; username?: string; displayName?: string; skillsHave?: string[]; skillsLearn?: string[] };
      return {
        id: person._id.toString(),
        username: person.username ?? "",
        displayName: person.displayName?.trim() || person.username || "",
        skillsHave: person.skillsHave ?? [],
        skillsLearn: person.skillsLearn ?? [],
      };
    };
    return NextResponse.json({
      received: received.flatMap((invite) => {
        const sender = summary(invite.sender);
        return sender ? [{ id: invite._id.toString(), createdAt: invite.createdAt.toISOString(), sender }] : [];
      }),
      sent: sent.flatMap((invite) => {
        const recipient = summary(invite.recipient);
        return recipient ? [{ id: invite._id.toString(), createdAt: invite.createdAt.toISOString(), recipient }] : [];
      }),
    });
  } catch (error) {
    console.error("Exchange invites GET error:", error);
    return NextResponse.json({ error: "Unable to load Exchange invitations." }, { status: 500 });
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
  const parsed = exchangeInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid invitation." }, { status: 400 });

  try {
    await connectDB();
    const recipient = await User.findById(parsed.data.recipientId).select("_id isProfileComplete skillsHave").lean();
    if (!recipient) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (recipient._id.equals(current._id)) return NextResponse.json({ error: "You cannot invite yourself." }, { status: 400 });
    if (!recipient.isProfileComplete || !recipient.skillsHave.length) {
      return NextResponse.json({ error: "This member has not completed their skills profile." }, { status: 409 });
    }

    const previous = await ExchangeInvite.findOne({
      sender: current._id,
      idempotencyKey: parsed.data.idempotencyKey,
    }).select("_id status exchangeId").lean();
    if (previous) return NextResponse.json({ id: previous._id.toString(), status: previous.status, exchangeId: previous.exchangeId?.toString() ?? null });

    const activeInvite = await ExchangeInvite.findOne({
      status: "pending",
      $or: [
        { sender: current._id, recipient: recipient._id },
        { sender: recipient._id, recipient: current._id },
      ],
    }).select("_id").lean();
    if (activeInvite) return NextResponse.json({ error: "An Exchange invitation is already pending." }, { status: 409 });

    const invite = await ExchangeInvite.create({
      sender: current._id,
      recipient: recipient._id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    await Notification.create({
      recipient: recipient._id,
      sender: current._id,
      type: "exchange_invite",
      resourceId: invite._id,
      dedupeKey: `exchange-invite:${invite._id}`,
    });
    return NextResponse.json({ id: invite._id.toString(), status: invite.status }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "This invitation was already sent." }, { status: 409 });
    }
    console.error("Exchange invite POST error:", error);
    return NextResponse.json({ error: "Unable to send Exchange invitation." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = exchangeInviteResponseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid invitation response." }, { status: 400 });

  const connection = await connectDB();
  const session = await connection.startSession();
  let result: { status: string; exchangeId?: string } | null = null;
  let failure: "missing" | "answered" | null = null;
  try {
    await session.withTransaction(async () => {
      const invite = await ExchangeInvite.findOne({ _id: parsed.data.requestId, recipient: current._id }).session(session);
      if (!invite) { failure = "missing"; return; }
      if (invite.status !== "pending") {
        const existing = invite.exchangeId
          ? await Exchange.findById(invite.exchangeId).session(session)
          : await Exchange.findOne({ inviteId: invite._id }).session(session);
        if (parsed.data.action === "accept" && existing) {
          result = { status: "accepted", exchangeId: existing._id.toString() };
          return;
        }
        failure = "answered";
        return;
      }

      const respondedAt = new Date();
      if (parsed.data.action === "decline") {
        invite.status = "declined";
        invite.respondedAt = respondedAt;
        await invite.save({ session });
        result = { status: "declined" };
        return;
      }

      invite.status = "accepted";
      invite.respondedAt = respondedAt;
      await invite.save({ session });
      const [exchange] = await Exchange.create([{
        members: [invite.sender, invite.recipient],
        weeklyGoal: "",
        createdBy: invite.sender,
        inviteId: invite._id,
        originAskId: null,
      }], { session });
      invite.exchangeId = exchange._id;
      await invite.save({ session });
      await Notification.create([{
        recipient: invite.sender,
        sender: current._id,
        type: "exchange_started",
        exchangeId: exchange._id,
        resourceId: invite._id,
        dedupeKey: `exchange-started:${invite._id}`,
      }], { session });
      result = { status: "accepted", exchangeId: exchange._id.toString() };
    });
  } catch (error) {
    console.error("Exchange invite response error:", error);
    return NextResponse.json({ error: "Unable to respond to this invitation." }, { status: 500 });
  } finally {
    await session.endSession();
  }
  if (failure === "missing") return NextResponse.json({ error: "Exchange invitation not found." }, { status: 404 });
  if (failure === "answered" || !result) return NextResponse.json({ error: "This invitation has already been answered." }, { status: 409 });
  return NextResponse.json(result);
}
