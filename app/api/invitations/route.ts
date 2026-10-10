import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import { publicUserSummary, requireCurrentUser } from "@/lib/session-user";
import Invitation from "@/models/Invitation";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const invitations = await Invitation.find({
      receiver: current._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username displayName skillsHave skillsLearn domainInterests")
      .lean();

    return NextResponse.json({
      invitations: invitations.map((inv) => {
        const sender = inv.sender as unknown as {
          _id: { toString(): string };
          username: string;
          displayName?: string;
          skillsHave?: string[];
          skillsLearn?: string[];
          domainInterests?: string[];
        };
        return {
          id: String(inv._id),
          status: inv.status,
          sender: publicUserSummary(sender),
        };
      }),
    });
  } catch (error) {
    console.error("Invitations GET error:", error);
    return NextResponse.json({ error: "Unable to load invitations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { receiverId?: string };
    const receiverId = body.receiverId?.trim();
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return NextResponse.json({ error: "Invalid receiver." }, { status: 400 });
    }

    if (receiverId === current._id.toString()) {
      return NextResponse.json({ error: "You cannot invite yourself." }, { status: 400 });
    }

    await connectDB();
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const existing = await Invitation.findOne({
      sender: current._id,
      receiver: receiver._id,
      status: "pending",
    });
    if (existing) {
      return NextResponse.json({ error: "Invite already pending." }, { status: 409 });
    }

    const invitation = await Invitation.create({
      sender: current._id,
      receiver: receiver._id,
      status: "pending",
    });

    return NextResponse.json({
      ok: true,
      invitation: {
        id: invitation._id.toString(),
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error("Invitations POST error:", error);
    return NextResponse.json({ error: "Unable to send invitation." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const current = await requireCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      invitationId?: string;
      status?: "accepted" | "declined";
    };
    const invitationId = body.invitationId?.trim();
    const status = body.status;

    if (!invitationId || !mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
    }
    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    await connectDB();
    const invitation = await Invitation.findOne({
      _id: invitationId,
      receiver: current._id,
      status: "pending",
    });
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    invitation.status = status;
    await invitation.save();

    if (status === "declined") {
      return NextResponse.json({ ok: true, status: "declined" });
    }

    const senderId = invitation.sender;
    const receiverId = invitation.receiver;

    await User.findByIdAndUpdate(senderId, { $set: { partnerId: receiverId } });
    await User.findByIdAndUpdate(receiverId, { $set: { partnerId: senderId } });

    const partner = await User.findById(senderId).select(
      "username displayName skillsHave skillsLearn domainInterests",
    );
    if (!partner) {
      return NextResponse.json({ error: "Partner not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: "accepted",
      partner: publicUserSummary(partner),
    });
  } catch (error) {
    console.error("Invitations PUT error:", error);
    return NextResponse.json({ error: "Unable to update invitation." }, { status: 500 });
  }
}
