import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { beaconSchema } from "@/lib/validation/schemas";
import Beacon from "@/models/Beacon";

const BEACON_TTL_MS = 12 * 60 * 60 * 1000;

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const beacons = await Beacon.find({
      active: true,
      createdAt: { $gte: new Date(Date.now() - BEACON_TTL_MS) },
    })
      .sort({ urgency: -1, createdAt: -1 })
      .populate("authorId", "username displayName")
      .lean();

    return NextResponse.json({
      beacons: beacons.map((beacon) => {
        const author = beacon.authorId as unknown as {
          _id: { toString(): string };
          username: string;
          displayName?: string;
        };
        return {
          id: beacon._id.toString(),
          author: {
            id: author._id.toString(),
            username: author.username,
            displayName: author.displayName ?? "",
          },
          eventLocation: beacon.eventLocation,
          missingSkill: beacon.missingSkill,
          urgency: beacon.urgency,
          createdAt: beacon.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("Beacons GET error:", error);
    return NextResponse.json({ error: "Unable to load active beacons." }, { status: 500 });
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

  const result = beaconSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid beacon details." },
      { status: 400 },
    );
  }
  const { eventLocation, missingSkill, urgency } = result.data;

  try {
    await connectDB();
    const beacon = await Beacon.create({
      authorId: current._id,
      eventLocation: eventLocation.slice(0, 120),
      missingSkill: missingSkill.slice(0, 100),
      urgency,
    });
    return NextResponse.json({
      beacon: {
        id: beacon._id.toString(),
        author: {
          id: current._id.toString(),
          username: current.username,
          displayName: current.displayName ?? "",
        },
        eventLocation: beacon.eventLocation,
        missingSkill: beacon.missingSkill,
        urgency: beacon.urgency,
        createdAt: beacon.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Beacons POST error:", error);
    return NextResponse.json({ error: "Unable to activate beacon." }, { status: 500 });
  }
}