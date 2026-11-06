import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IReview {
  quest: Types.ObjectId;
  submission: Types.ObjectId;
  reviewer: Types.ObjectId;
  rating: number;
  feedback: string;
  decision: "approved" | "changes_requested";
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true, index: true },
    submission: { type: Schema.Types.ObjectId, ref: "Submission", required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, required: true, maxlength: 2000 },
    decision: { type: String, enum: ["approved", "changes_requested"], required: true },
  },
  { timestamps: true },
);

ReviewSchema.index({ submission: 1, reviewer: 1 }, { unique: true });

const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview> | undefined) ??
  mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
