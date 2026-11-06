import mongoose, { Types } from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { askCloseSchema, askSchema } from "@/lib/validation/schemas";
import Ask from "@/models/Ask";

type PopulatedAskAuthor = { _id: Types.ObjectId; username: string; displayName?: string };

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!current.isProfileComplete || !current.skillsHave.length) {
    return NextResponse.json({ error: "Complete your skills profile first.", redirectTo: "/onboarding" }, { status: 409 });
  }

  try {
    await connectDB();
    const asks = await Ask.find({ status: "open", authorId: { $ne: current._id } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate<{ authorId: PopulatedAskAuthor }>("authorId", "username displayName")
      .lean();
    return NextResponse.json({
      asks: asks.map((ask) => ({
        id: ask._id.toString(),
        author: {
          id: ask.authorId._id.toString(),
          username: ask.authorId.username,
          displayName: ask.authorId.displayName?.trim() || ask.authorId.username,
        },
        skillOffered: ask.skillOffered,
        skillWanted: ask.skillWanted,
        note: ask.note,
        createdAt: ask.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Asks GET error:", error);
    return NextResponse.json({ error: "Unable to load open Asks." }, { status: 500 });
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
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Ask." }, { status: 400 });
  }

  try {
    await connectDB();
    const ask = await Ask.create({ ...parsed.data, authorId: current._id });
    return NextResponse.json({
      ask: {
        id: ask._id.toString(),
        author: {
          id: current._id.toString(),
          username: current.username,
          displayName: current.displayName?.trim() || current.username,
        },
        skillOffered: ask.skillOffered,
        skillWanted: ask.skillWanted,
        note: ask.note,
        createdAt: ask.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Asks POST error:", error);
    return NextResponse.json({ error: "Unable to publish your Ask." }, { status: 500 });
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
  const parsed = askCloseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Ask update." }, { status: 400 });
  const askId = new mongoose.Types.ObjectId(parsed.data.askId);

  try {
    await connectDB();
    const ask = await Ask.findOneAndUpdate(
      { _id: askId, authorId: current._id, status: "open" },
      { $set: { status: "closed" } },
      { new: true },
    ).lean();
    if (!ask) return NextResponse.json({ error: "Open Ask not found." }, { status: 404 });
    return NextResponse.json({ ok: true, id: ask._id.toString() });
  } catch (error) {
    console.error("Asks PATCH error:", error);
    return NextResponse.json({ error: "Unable to close this Ask." }, { status: 500 });
  }
}
