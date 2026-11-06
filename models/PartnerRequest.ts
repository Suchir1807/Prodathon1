import mongoose, { type Model, Schema, Types } from "mongoose";

export type PartnerRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface IPartnerRequest {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  status: PartnerRequestStatus;
  idempotencyKey?: string;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerRequestSchema = new Schema<IPartnerRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
    idempotencyKey: { type: String, maxlength: 100 },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PartnerRequestSchema.index({ sender: 1, recipient: 1, status: 1 });
PartnerRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
PartnerRequestSchema.index(
  { sender: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } }, name: "partner_request_idempotency" },
);

const PartnerRequest: Model<IPartnerRequest> =
  (mongoose.models.PartnerRequest as Model<IPartnerRequest> | undefined) ??
  mongoose.model<IPartnerRequest>("PartnerRequest", PartnerRequestSchema);

export default PartnerRequest;
