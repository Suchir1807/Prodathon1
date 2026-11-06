import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISessionRoom {
  sessionId: Types.ObjectId;
  exchangeId: Types.ObjectId;
  members: Types.ObjectId[];
  notes: string;
  notesRevision: number;
  lastEditedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionRoomSchema = new Schema<ISessionRoom>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, unique: true },
    exchangeId: { type: Schema.Types.ObjectId, ref: "Exchange", required: true },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      required: true,
      validate: {
        validator: (members: Types.ObjectId[]) => members.length === 2,
        message: "A SessionRoom must have exactly two members.",
      },
    },
    notes: { type: String, maxlength: 20_000, default: "" },
    notesRevision: { type: Number, default: 0 },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

SessionRoomSchema.index({ members: 1, updatedAt: -1 });
SessionRoomSchema.index({ exchangeId: 1, updatedAt: -1 });

const SessionRoom: Model<ISessionRoom> =
  (mongoose.models.SessionRoom as Model<ISessionRoom> | undefined) ??
  mongoose.model<ISessionRoom>("SessionRoom", SessionRoomSchema);

export default SessionRoom;
