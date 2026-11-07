import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import { availabilitySchema } from "@/lib/validation/schemas";
import User from "@/models/User";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const user = await User.findById(current._id)
      .select("availableUntil availableFor timezone quietHoursStart quietHoursEnd dailyHelpNowLimit")
      .lean();
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const isAvailable = Boolean(user.availableUntil && user.availableUntil > new Date());
    if (user.availableUntil && !isAvailable) {
      await User.updateOne({ _id: current._id, availableUntil: user.availableUntil }, { $set: { availableUntil: null } });
    }
    return NextResponse.json({
      available: isAvailable,
      availableUntil: isAvailable ? user.availableUntil?.toISOString() : null,
      availableFor: user.availableFor ?? [],
      timezone: user.timezone ?? "UTC",
      quietHoursStart: user.quietHoursStart ?? "",
      quietHoursEnd: user.quietHoursEnd ?? "",
      dailyHelpNowLimit: user.dailyHelpNowLimit ?? 5,
    });
  } catch (error) {
    console.error("Availability GET error:", error);
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid availability." }, { status: 400 });

  try {
    await connectDB();
    const values = parsed.data;
    const updated = await User.findByIdAndUpdate(
      current._id,
      {
        $set: {
          availableUntil: values.available ? new Date(Date.now() + values.durationMinutes * 60_000) : null,
          availableFor: values.availableFor,
          ...(values.timezone ? { timezone: values.timezone } : {}),
          ...(values.quietHoursStart !== undefined ? { quietHoursStart: values.quietHoursStart } : {}),
          ...(values.quietHoursEnd !== undefined ? { quietHoursEnd: values.quietHoursEnd } : {}),
          ...(values.dailyHelpNowLimit !== undefined ? { dailyHelpNowLimit: values.dailyHelpNowLimit } : {}),
        },
      },
      { new: true },
    ).select("availableUntil availableFor timezone quietHoursStart quietHoursEnd dailyHelpNowLimit").lean();
    if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({
      available: Boolean(updated.availableUntil && updated.availableUntil > new Date()),
      availableUntil: updated.availableUntil?.toISOString() ?? null,
      availableFor: updated.availableFor,
      timezone: updated.timezone,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
      dailyHelpNowLimit: updated.dailyHelpNowLimit,
    });
  } catch (error) {
    console.error("Availability PUT error:", error);
    return NextResponse.json({ error: "Unable to update availability." }, { status: 500 });
  }
}
