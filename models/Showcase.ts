import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IShowcase {
  quest: Types.ObjectId;
  submission: Types.ObjectId;
  publicId: string;
  visibility: "public" | "unlisted";
  createdAt: Date;
  updatedAt: Date;
}

const ShowcaseSchema = new Schema<IShowcase>(
  {
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true, unique: true },
    submission: { type: Schema.Types.ObjectId, ref: "Submission", required: true },
    publicId: { type: String, required: true, unique: true, index: true },
    visibility: { type: String, enum: ["public", "unlisted"], default: "public" },
  },
  { timestamps: true },
);

const Showcase: Model<IShowcase> =
  (mongoose.models.Showcase as Model<IShowcase> | undefined) ??
  mongoose.model<IShowcase>("Showcase", ShowcaseSchema);

export default Showcase;
