import mongoose, { type Model, Schema, Types } from "mongoose";

export type HelpRequestStatus =
  | "searching"
  | "offered"
  | "matched"
  | "no_match"
  | "cancelled"
  | "completed";

export interface IHelpRequest {
  requesterId: Types.ObjectId;
  problem: string;
  urgency: "now" | "within_hour";
  durationMinutes: 15 | 30;
  category: string;
  skill: string;
  difficulty: string;
  helperBrief: string;
  searchTags: string[];
  quickAnswer: string;
  status: HelpRequestStatus;
  candidateIds: Types.ObjectId[];
  attemptedCandidateIds: Types.ObjectId[];
  currentOfferId: Types.ObjectId | null;
  sessionId: Types.ObjectId | null;
  recap: string;
  practiceSteps: string[];
  createdAt: Date;
  updatedAt: Date;
}

const HelpRequestSchema = new Schema<IHelpRequest>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    problem: { type: String, trim: true, required: true, maxlength: 1000 },
    urgency: { type: String, enum: ["now", "within_hour"], required: true },
    durationMinutes: { type: Number, enum: [15, 30], required: true },
    category: { type: String, required: true, maxlength: 40 },
    skill: { type: String, required: true, maxlength: 80 },
    difficulty: { type: String, required: true, maxlength: 30 },
    helperBrief: { type: String, required: true, maxlength: 500 },
    searchTags: { type: [String], default: [] },
    quickAnswer: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["searching", "offered", "matched", "no_match", "cancelled", "completed"],
      default: "searching",
      required: true,
    },
    candidateIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attemptedCandidateIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    currentOfferId: { type: Schema.Types.ObjectId, ref: "HelpOffer", default: null },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null },
    recap: { type: String, default: "", maxlength: 2000 },
    practiceSteps: { type: [String], default: [] },
  },
  { timestamps: true },
);

HelpRequestSchema.index({ requesterId: 1, createdAt: -1 });
HelpRequestSchema.index({ status: 1, updatedAt: 1 });

const HelpRequest: Model<IHelpRequest> =
  (mongoose.models.HelpRequest as Model<IHelpRequest> | undefined) ??
  mongoose.model<IHelpRequest>("HelpRequest", HelpRequestSchema);

export default HelpRequest;
