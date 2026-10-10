import mongoose, { type Model, Schema, Types } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface IInvitation {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  status: InvitationStatus;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true },
);

InvitationSchema.index({ receiver: 1, status: 1 });
InvitationSchema.index({ sender: 1, receiver: 1 });

const Invitation: Model<IInvitation> =
  (mongoose.models.Invitation as Model<IInvitation> | undefined) ??
  mongoose.model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;
