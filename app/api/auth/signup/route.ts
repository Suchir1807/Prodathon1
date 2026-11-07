import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { signupRequestSchema } from "@/lib/validation/schemas";
import CreditAccount from "@/models/CreditAccount";
import CreditLedger from "@/models/CreditLedger";
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
    const hashed = await bcrypt.hash(password, 12);
    const connection = await connectDB();
    const transaction = await connection.startSession();
    try {
      await transaction.withTransaction(async () => {
        const existing = await User.findOne({ username }).select("_id").session(transaction).lean();
        if (existing) throw new Error("USERNAME_TAKEN");
        const [user] = await User.create([{ username, password: hashed }], { session: transaction });
        await CreditAccount.create([{ userId: user._id, balance: 2 }], { session: transaction });
        await CreditLedger.create([{
          userId: user._id,
          amount: 2,
          type: "starter",
          idempotencyKey: "starter:welcome",
        }], { session: transaction });
      });
    } finally {
      await transaction.endSession();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Unable to create account. Try again later." },
      { status: 500 },
    );
  }
}
