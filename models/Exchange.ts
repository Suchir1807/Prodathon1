import mongoose, { type Model, Schema, Types } from "mongoose";

export type ExchangeStatus = "active" | "paused" | "ended";

export interface IExchange {
  members: Types.ObjectId[];
  cadence: "weekly";
  weeklyGoal: string;
  status: ExchangeStatus;
  createdBy: Types.ObjectId;
  inviteId: Types.ObjectId | null;
  originAskId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeSchema = new Schema<IExchange>(
  {
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      required: true,
      validate: {
        validator: (members: Types.ObjectId[]) => members.length === 2,
        message: "An Exchange must have exactly two members.",
      },
    },
    cadence: { type: String, enum: ["weekly"], default: "weekly", required: true },
    weeklyGoal: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["active", "paused", "ended"], default: "active", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteId: { type: Schema.Types.ObjectId, ref: "ExchangeInvite", default: null },
    originAskId: { type: Schema.Types.ObjectId, ref: "Ask", default: null },
  },
  { timestamps: true },
);

ExchangeSchema.index({ members: 1, status: 1, updatedAt: -1 });
ExchangeSchema.index({ inviteId: 1 }, { unique: true, partialFilterExpression: { inviteId: { $type: "objectId" } } });
ExchangeSchema.index({ originAskId: 1 }, { unique: true, partialFilterExpression: { originAskId: { $type: "objectId" } } });

const Exchange: Model<IExchange> =
  (mongoose.models.Exchange as Model<IExchange> | undefined) ??
  mongoose.model<IExchange>("Exchange", ExchangeSchema);

export default Exchange;
