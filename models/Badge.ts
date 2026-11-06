import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IBadge {
  user: Types.ObjectId;
  quest: Types.ObjectId;
  skill: string;
  submission: Types.ObjectId;
  review: Types.ObjectId;
  verifiedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true },
    skill: { type: String, required: true, trim: true, maxlength: 80 },
    submission: { type: Schema.Types.ObjectId, ref: "Submission", required: true },
    review: { type: Schema.Types.ObjectId, ref: "Review", required: true },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

BadgeSchema.index({ user: 1, quest: 1, skill: 1 }, { unique: true });

const Badge: Model<IBadge> =
  (mongoose.models.Badge as Model<IBadge> | undefined) ??
  mongoose.model<IBadge>("Badge", BadgeSchema);

export default Badge;
