import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IMessage {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  sessionRoomId?: Types.ObjectId;
  content: string;
  timestamp: Date;
  readAt?: Date | null;
  idempotencyKey?: string;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
    },
    sessionRoomId: { type: Schema.Types.ObjectId, ref: "SessionRoom", index: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
    idempotencyKey: { type: String, maxlength: 100 },
  },
  { timestamps: false },
);

MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });
MessageSchema.index({ workspaceId: 1, senderId: 1, receiverId: 1, timestamp: 1 });
MessageSchema.index({ sessionRoomId: 1, timestamp: 1 });
MessageSchema.index(
  { senderId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } }, name: "message_idempotency" },
);
MessageSchema.index(
  { sessionRoomId: 1, senderId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } }, name: "session_room_message_idempotency" },
);

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage> | undefined) ??
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;