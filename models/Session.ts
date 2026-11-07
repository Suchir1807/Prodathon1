import mongoose, { type Model, Schema, Types } from "mongoose";

export type SessionStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface ISession {
  exchangeId: Types.ObjectId | null;
  kind: "scheduled" | "help_now";
  helpRequestId: Types.ObjectId | null;
  participants: Types.ObjectId[];
  teacherId: Types.ObjectId;
  learnerId: Types.ObjectId;
  topic: string;
  startsAt: Date;
  durationMinutes: number;
  status: SessionStatus;
  roomId: Types.ObjectId;
  idempotencyKey: string;
  completedAt: Date | null;
  completionConfirmedBy: Types.ObjectId[];
  aiBrief: string;
  jitsiUrl: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    exchangeId: { type: Schema.Types.ObjectId, ref: "Exchange", default: null },
    kind: { type: String, enum: ["scheduled", "help_now"], default: "scheduled", required: true },
    helpRequestId: { type: Schema.Types.ObjectId, ref: "HelpRequest", default: null },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      required: true,
      validate: {
        validator: (participants: Types.ObjectId[]) => participants.length === 2,
        message: "A Session must have exactly two participants.",
      },
    },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    learnerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true, trim: true, maxlength: 200 },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 180 },
    status: { type: String, enum: ["scheduled", "completed", "cancelled", "no_show"], default: "scheduled", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "SessionRoom", required: true, unique: true },
    idempotencyKey: { type: String, required: true, maxlength: 100 },
    completedAt: { type: Date, default: null },
    completionConfirmedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    aiBrief: { type: String, trim: true, maxlength: 500, default: "" },
    jitsiUrl: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

SessionSchema.index({ participants: 1, startsAt: 1, status: 1 });
SessionSchema.index({ exchangeId: 1, startsAt: -1 });
SessionSchema.index({ helpRequestId: 1 }, { unique: true, partialFilterExpression: { helpRequestId: { $type: "objectId" } } });
SessionSchema.index({ createdBy: 1, idempotencyKey: 1 }, { unique: true });

const Session: Model<ISession> =
  (mongoose.models.Session as Model<ISession> | undefined) ??
  mongoose.model<ISession>("Session", SessionSchema);

export default Session;
