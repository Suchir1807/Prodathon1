import mongoose, { type Model, Schema, Types } from "mongoose";

export type NotificationType =
  | "follow"
  | "exchange_invite"
  | "exchange_started"
  | "ask_matched"
  | "session_booked"
  | "session_reminder"
  | "session_completed"
  | "new_message"
  | "session_review";

export interface INotification {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  isRead: boolean;
  exchangeId?: Types.ObjectId;
  sessionId?: Types.ObjectId;
  askId?: Types.ObjectId;
  sessionRoomId?: Types.ObjectId;
  resourceId?: Types.ObjectId;
  dedupeKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "follow",
        "exchange_invite",
        "exchange_started",
        "ask_matched",
        "session_booked",
        "session_reminder",
        "session_completed",
        "new_message",
        "session_review",
      ],
      default: "follow",
      required: true,
    },
    exchangeId: { type: Schema.Types.ObjectId, ref: "Exchange" },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
    askId: { type: Schema.Types.ObjectId, ref: "Ask" },
    sessionRoomId: { type: Schema.Types.ObjectId, ref: "SessionRoom" },
    resourceId: { type: Schema.Types.ObjectId },
    dedupeKey: { type: String, maxlength: 180 },
    isRead: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index(
  { recipient: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification> | undefined) ??
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
