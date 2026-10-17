import { NextResponse } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { barterSchema } from "@/lib/validation/schemas";
import Barter from "@/models/Barter";

type BarterAuthorProjection = {
  _id: Types.ObjectId;
  username: string;
  displayName?: string;
};

type BarterFeedProjection = {
  _id: Types.ObjectId;
  authorId: BarterAuthorProjection;
  skillOffered: string;
  skillNeeded: string;
  description: string;
  createdAt?: Date;
};

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const barters = await Barter.find({ status: "open" })
      .select("_id authorId skillOffered skillNeeded description createdAt")
      .sort({ createdAt: -1 })
      .populate<{ authorId: BarterAuthorProjection }>("authorId", "username displayName")
      .lean<BarterFeedProjection[]>();
    return NextResponse.json({
      barters: barters.map((barter) => {
        const { authorId: author } = barter;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = barterSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid trade details." },
      { status: 400 },
    );
  }
  const { skillOffered, skillNeeded, description } = result.data;

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