import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { ensureCreditAccount, getCreditBalance } from "@/lib/credit-balance";
import { requireCurrentUser } from "@/lib/session-user";
import CreditLedger from "@/models/CreditLedger";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    await ensureCreditAccount(current._id);
    const [balance, entries] = await Promise.all([
      getCreditBalance(current._id),
      CreditLedger.find({ userId: current._id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return NextResponse.json({
      balance,
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        amount: entry.amount,
        type: entry.type,
        sessionId: entry.sessionId?.toString() ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Credits GET error:", error);
    return NextResponse.json({ error: "Unable to load your time credits." }, { status: 500 });
  }
}
