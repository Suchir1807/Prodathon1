import mongoose, { type Model, Schema, Types } from "mongoose";

export type AskStatus = "open" | "matched" | "closed";

export interface IAsk {
  authorId: Types.ObjectId;
  skillOffered: string;
  skillWanted: string;
  note: string;
  status: AskStatus;
  matchedWith: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AskSchema = new Schema<IAsk>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    skillOffered: { type: String, trim: true, required: true, maxlength: 80 },
    skillWanted: { type: String, trim: true, required: true, maxlength: 80 },
    note: { type: String, trim: true, required: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "matched", "closed"], default: "open", required: true },
    matchedWith: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

AskSchema.index({ status: 1, createdAt: -1 });
AskSchema.index({ authorId: 1, status: 1, createdAt: -1 });

const Ask: Model<IAsk> =
  (mongoose.models.Ask as Model<IAsk> | undefined) ??
  mongoose.model<IAsk>("Ask", AskSchema);

export default Ask;
