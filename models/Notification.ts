import mongoose, { type Model, Schema, Types } from "mongoose";

export type NotificationType = "follow";

export interface INotification {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["follow"], default: "follow", required: true },
    isRead: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification> | undefined) ??
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
