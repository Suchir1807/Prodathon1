import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISessionReview {
  sessionId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  recipientId: Types.ObjectId;
  rating: number;
  feedback: string;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SessionReviewSchema = new Schema<ISessionReview>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, trim: true, default: "", maxlength: 2000 },
    skills: { type: [String], default: [] },
  },
  { timestamps: true },
);

SessionReviewSchema.index({ sessionId: 1, reviewerId: 1 }, { unique: true });
SessionReviewSchema.index({ recipientId: 1, createdAt: -1 });

const SessionReview: Model<ISessionReview> =
  (mongoose.models.SessionReview as Model<ISessionReview> | undefined) ??
  mongoose.model<ISessionReview>("SessionReview", SessionReviewSchema);

export default SessionReview;
