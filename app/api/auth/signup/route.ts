import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { signupRequestSchema } from "@/lib/validation/schemas";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = signupRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid signup details." },
        { status: 400 },
      );
    }

    const { username, password } = result.data;
    await connectDB();

    const existing = await User.findOne({ username });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.create({ username, password: hashed });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Unable to create account. Try again later." },
      { status: 500 },
    );
  }
}
