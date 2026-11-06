import mongoose, { type Model, Schema, Types } from "mongoose";

export type QuestStatus =
  | "pending"
  | "active"
  | "submitted"
  | "changes_requested"
  | "reviewed"
  | "completed"
  | "abandoned";

export interface IQuestMember {
  user: Types.ObjectId;
  role: "A" | "B";
  acceptedAt: Date | null;
}

export interface IQuest {
  members: IQuestMember[];
  sourceRequest: Types.ObjectId;
  title: string;
  brief: string;
  status: QuestStatus;
  generationSource: "gemini" | "sample";
  skillsUsed: string[];
  roles: { A: string; B: string };
  curveball: { text: string; unlockHour: number; unlockedAt: Date | null; taskAdded: boolean };
  stretchGoal: string;
  startedAt: Date | null;
  deadline: Date | null;
  submissionId: Types.ObjectId | null;
  reviewId: Types.ObjectId | null;
  hintCounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const QuestSchema = new Schema<IQuest>(
  {
    members: {
      type: [{
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["A", "B"], required: true },
        acceptedAt: { type: Date, default: null },
      }],
      required: true,
      validate: {
        validator: (members: IQuestMember[]) => members.length === 2,
        message: "A quest must have exactly two members.",
      },
    },
    sourceRequest: { type: Schema.Types.ObjectId, ref: "PartnerRequest", required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    brief: { type: String, required: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["pending", "active", "submitted", "changes_requested", "reviewed", "completed", "abandoned"],
      default: "pending",
      required: true,
    },
    generationSource: { type: String, enum: ["gemini", "sample"], default: "sample", required: true },
    skillsUsed: { type: [String], default: [] },
    roles: {
      A: { type: String, required: true, maxlength: 300 },
      B: { type: String, required: true, maxlength: 300 },
    },
    curveball: {
      text: { type: String, required: true, maxlength: 500 },
      unlockHour: { type: Number, default: 36, min: 1, max: 71 },
      unlockedAt: { type: Date, default: null },
      taskAdded: { type: Boolean, default: false },
    },
    stretchGoal: { type: String, required: true, maxlength: 500 },
    startedAt: { type: Date, default: null },
    deadline: { type: Date, default: null },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", default: null },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", default: null },
    hintCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

QuestSchema.index({ "members.user": 1, status: 1, updatedAt: -1 });
QuestSchema.index({ status: 1, deadline: 1 });

const Quest: Model<IQuest> =
  (mongoose.models.Quest as Model<IQuest> | undefined) ??
  mongoose.model<IQuest>("Quest", QuestSchema);

export default Quest;
