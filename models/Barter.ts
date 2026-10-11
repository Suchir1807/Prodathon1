import mongoose, { type Model, Schema, Types } from "mongoose";

export type BarterStatus = "open" | "in-progress" | "completed";

export interface IBarter {
  authorId: Types.ObjectId;
  partnerId?: Types.ObjectId | null;
  skillOffered: string;
  skillNeeded: string;
  description: string;
  status: BarterStatus;
  createdAt?: Date;
}

const BarterSchema = new Schema<IBarter>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    skillOffered: { type: String, required: true, trim: true },
    skillNeeded: { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 300 },
    status: {
      type: String,
      enum: ["open", "in-progress", "completed"],
      default: "open",
    },
  },
  { timestamps: true },
);

const Barter: Model<IBarter> =
  (mongoose.models.Barter as Model<IBarter> | undefined) ??
  mongoose.model<IBarter>("Barter", BarterSchema);

export default Barter;