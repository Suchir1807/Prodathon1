import mongoose, { type Model, Schema, Types } from "mongoose";

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export interface ISession {
  exchangeId: Types.ObjectId;
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
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    exchangeId: { type: Schema.Types.ObjectId, ref: "Exchange", required: true },
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
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "SessionRoom", required: true, unique: true },
    idempotencyKey: { type: String, required: true, maxlength: 100 },
    completedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

SessionSchema.index({ participants: 1, startsAt: 1, status: 1 });
SessionSchema.index({ exchangeId: 1, startsAt: -1 });
SessionSchema.index({ createdBy: 1, idempotencyKey: 1 }, { unique: true });

const Session: Model<ISession> =
  (mongoose.models.Session as Model<ISession> | undefined) ??
  mongoose.model<ISession>("Session", SessionSchema);

export default Session;
