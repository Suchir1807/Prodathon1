import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IHelpSafetyRecord {
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  requestId: Types.ObjectId;
  reason: string;
  kind: "report" | "block";
  createdAt: Date;
}

const HelpSafetyRecordSchema = new Schema<IHelpSafetyRecord>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestId: { type: Schema.Types.ObjectId, ref: "HelpRequest", required: true },
    reason: { type: String, trim: true, required: true, maxlength: 500 },
    kind: { type: String, enum: ["report", "block"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

HelpSafetyRecordSchema.index({ reporterId: 1, reportedUserId: 1, kind: 1 });
HelpSafetyRecordSchema.index({ requestId: 1, createdAt: -1 });

const HelpSafetyRecord: Model<IHelpSafetyRecord> =
  (mongoose.models.HelpSafetyRecord as Model<IHelpSafetyRecord> | undefined) ??
  mongoose.model<IHelpSafetyRecord>("HelpSafetyRecord", HelpSafetyRecordSchema);

export default HelpSafetyRecord;
