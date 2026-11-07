import mongoose, { type Model, Schema, Types } from "mongoose";

export type CreditEntryType =
  | "starter"
  | "session_hold"
  | "session_release"
  | "session_earned"
  | "session_spent"
  | "session_refund"
  | "adjustment";

export interface ICreditLedgerEntry {
  userId: Types.ObjectId;
  counterpartyId: Types.ObjectId | null;
  sessionId: Types.ObjectId | null;
  amount: number;
  type: CreditEntryType;
  idempotencyKey: string;
  createdAt: Date;
}

const CreditLedgerSchema = new Schema<ICreditLedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    counterpartyId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null },
    amount: { type: Number, required: true, min: -180, max: 180 },
    type: {
      type: String,
      enum: ["starter", "session_hold", "session_release", "session_earned", "session_spent", "session_refund", "adjustment"],
      required: true,
    },
    idempotencyKey: { type: String, required: true, maxlength: 120 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CreditLedgerSchema.index({ userId: 1, createdAt: -1 });
CreditLedgerSchema.index({ sessionId: 1, userId: 1, type: 1 });
CreditLedgerSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

const CreditLedger: Model<ICreditLedgerEntry> =
  (mongoose.models.CreditLedger as Model<ICreditLedgerEntry> | undefined) ??
  mongoose.model<ICreditLedgerEntry>("CreditLedger", CreditLedgerSchema);

export default CreditLedger;
