import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IHelpOffer {
  requestId: Types.ObjectId;
  helperId: Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const HelpOfferSchema = new Schema<IHelpOffer>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "HelpRequest", required: true },
    helperId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined", "expired"], default: "pending" },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

HelpOfferSchema.index({ requestId: 1, helperId: 1 }, { unique: true });
HelpOfferSchema.index({ helperId: 1, status: 1, expiresAt: 1 });

const HelpOffer: Model<IHelpOffer> =
  (mongoose.models.HelpOffer as Model<IHelpOffer> | undefined) ??
  mongoose.model<IHelpOffer>("HelpOffer", HelpOfferSchema);

export default HelpOffer;
