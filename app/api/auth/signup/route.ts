import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–32 characters and use only letters, numbers, or underscores.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

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
