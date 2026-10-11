import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IMessage {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  timestamp: Date;
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
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage> | undefined) ??
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;