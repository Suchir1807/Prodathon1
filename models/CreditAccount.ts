import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ICreditAccount {
  userId: Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const CreditAccountSchema = new Schema<ICreditAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, required: true, min: 0, default: 2 },
  },
  { timestamps: true },
);

const CreditAccount: Model<ICreditAccount> =
  (mongoose.models.CreditAccount as Model<ICreditAccount> | undefined) ??
  mongoose.model<ICreditAccount>("CreditAccount", CreditAccountSchema);

export default CreditAccount;
