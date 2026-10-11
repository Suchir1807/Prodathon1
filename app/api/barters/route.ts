import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Barter from "@/models/Barter";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const barters = await Barter.find({ status: "open" })
      .sort({ createdAt: -1 })
      .populate("authorId", "username displayName")
      .lean();
    return NextResponse.json({
      barters: barters.map((barter) => {
        const author = barter.authorId as unknown as {
          _id: { toString(): string };
          username: string;
          displayName?: string;
        };
        return {
          id: barter._id.toString(),
          author: {
            id: author._id.toString(),
            username: author.username,
            displayName: author.displayName ?? "",
          },
          skillOffered: barter.skillOffered,
          skillNeeded: barter.skillNeeded,
          description: barter.description,
          createdAt: barter.createdAt?.toISOString() ?? "",
        };
      }),
    });
  } catch (error) {
    console.error("Barters GET error:", error);
    return NextResponse.json({ error: "Unable to load open trades." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { skillOffered?: unknown; skillNeeded?: unknown; description?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const skillOffered = typeof body.skillOffered === "string" ? body.skillOffered.trim() : "";
  const skillNeeded = typeof body.skillNeeded === "string" ? body.skillNeeded.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!skillOffered || !skillNeeded || !description || description.length > 300) {
    return NextResponse.json(
      { error: "Offer, need, and a description of up to 300 characters are required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const barter = await Barter.create({
      authorId: current._id,
      skillOffered,
      skillNeeded,
      description,
    });
    return NextResponse.json({
      barter: {
        id: barter._id.toString(),
        author: {
          id: current._id.toString(),
          username: current.username,
          displayName: current.displayName ?? "",
        },
        skillOffered: barter.skillOffered,
        skillNeeded: barter.skillNeeded,
        description: barter.description,
        createdAt: barter.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Barters POST error:", error);
    return NextResponse.json({ error: "Unable to post trade." }, { status: 500 });
  }
}