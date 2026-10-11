import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
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

  let body: { eventLocation?: unknown; missingSkill?: unknown; urgency?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const eventLocation = typeof body.eventLocation === "string" ? body.eventLocation.trim() : "";
  const missingSkill = typeof body.missingSkill === "string" ? body.missingSkill.trim() : "";
  const urgency = body.urgency === "Critical" ? "Critical" : "High";
  if (!eventLocation || !missingSkill) {
    return NextResponse.json({ error: "Event name and required skill are required." }, { status: 400 });
  }

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