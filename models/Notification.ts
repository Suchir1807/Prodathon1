import mongoose, { type Model, Schema, Types } from "mongoose";

export type NotificationType =
  | "follow"
  | "partner_request"
  | "request_accepted"
  | "quest_ready"
  | "task_completed"
  | "new_message"
  | "curveball_unlocked"
  | "submission"
  | "review";

export interface INotification {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  isRead: boolean;
  questId?: Types.ObjectId;
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
        "partner_request",
        "request_accepted",
        "quest_ready",
        "task_completed",
        "new_message",
        "curveball_unlocked",
        "submission",
        "review",
      ],
      default: "follow",
      required: true,
    },
    questId: { type: Schema.Types.ObjectId, ref: "Quest" },
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
