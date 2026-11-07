import type { ClientSession, Types } from "mongoose";

import CreditAccount from "@/models/CreditAccount";
import CreditLedger, { type CreditEntryType } from "@/models/CreditLedger";

export async function postCreditEntry({
  userId,
  amount,
  type,
  idempotencyKey,
  sessionId = null,
  counterpartyId = null,
  transaction,
}: {
  userId: Types.ObjectId;
  amount: number;
  type: CreditEntryType;
  idempotencyKey: string;
  sessionId?: Types.ObjectId | null;
  counterpartyId?: Types.ObjectId | null;
  transaction: ClientSession;
}) {
  const existing = await CreditLedger.findOne({ userId, idempotencyKey }).session(transaction).lean();
  if (existing) return { applied: false, balance: null };

  const account = await CreditAccount.findOne({ userId }).session(transaction);
  if (!account || (amount < 0 && account.balance < Math.abs(amount))) {
    return { applied: false, balance: account?.balance ?? null };
  }
  const updated = await CreditAccount.findOneAndUpdate(
    { userId, ...(amount < 0 ? { balance: { $gte: Math.abs(amount) } } : {}) },
    { $inc: { balance: amount } },
    { new: true, session: transaction },
  );
  if (!updated) return { applied: false, balance: account.balance };
  await CreditLedger.create([{
    userId,
    counterpartyId,
    sessionId,
    amount,
    type,
    idempotencyKey,
  }], { session: transaction });
  return { applied: true, balance: updated.balance };
}
