import type { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import CreditAccount from "@/models/CreditAccount";
import CreditLedger from "@/models/CreditLedger";

export async function ensureCreditAccount(userId: Types.ObjectId) {
  const connection = await connectDB();
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      await CreditAccount.updateOne(
        { userId },
        { $setOnInsert: { balance: 2 } },
        { upsert: true, session },
      );
      await CreditLedger.updateOne(
        { userId, idempotencyKey: "starter:welcome" },
        {
          $setOnInsert: {
            userId,
            counterpartyId: null,
            sessionId: null,
            amount: 2,
            type: "starter",
            idempotencyKey: "starter:welcome",
          },
        },
        { upsert: true, session },
      );
    });
  } finally {
    await session.endSession();
  }
}

export async function getCreditBalance(userId: Types.ObjectId) {
  const account = await CreditAccount.findOne({ userId }).select("balance").lean();
  return account?.balance ?? 0;
}
