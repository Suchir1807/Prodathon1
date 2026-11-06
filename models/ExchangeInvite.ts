import mongoose, { type Model, Schema, Types } from "mongoose";

export type ExchangeInviteStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface IExchangeInvite {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  status: ExchangeInviteStatus;
  idempotencyKey?: string;
  exchangeId: Types.ObjectId | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeInviteSchema = new Schema<IExchangeInvite>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
    idempotencyKey: { type: String, maxlength: 100 },
    exchangeId: { type: Schema.Types.ObjectId, ref: "Exchange", default: null },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ExchangeInviteSchema.index({ sender: 1, recipient: 1, status: 1 });
ExchangeInviteSchema.index({ recipient: 1, status: 1, createdAt: -1 });
ExchangeInviteSchema.index(
  { sender: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

const ExchangeInvite: Model<IExchangeInvite> =
  (mongoose.models.ExchangeInvite as Model<IExchangeInvite> | undefined) ??
  mongoose.model<IExchangeInvite>("ExchangeInvite", ExchangeInviteSchema);

export default ExchangeInvite;
