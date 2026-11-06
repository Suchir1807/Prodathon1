import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISkillBadge {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  reviewId: Types.ObjectId;
  skill: string;
  earnedAt: Date;
}

const SkillBadgeSchema = new Schema<ISkillBadge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    reviewId: { type: Schema.Types.ObjectId, ref: "SessionReview", required: true },
    skill: { type: String, trim: true, required: true, maxlength: 80 },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "badges" },
);

SkillBadgeSchema.index({ userId: 1, sessionId: 1, skill: 1 }, { unique: true });

const SkillBadge: Model<ISkillBadge> =
  (mongoose.models.SkillBadge as Model<ISkillBadge> | undefined) ??
  mongoose.model<ISkillBadge>("SkillBadge", SkillBadgeSchema);

export default SkillBadge;
