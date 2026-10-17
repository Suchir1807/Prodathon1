import mongoose, { type Model, Schema, Types } from "mongoose";

export type BeaconUrgency = "High" | "Critical";

export interface IBeacon {
  authorId: Types.ObjectId;
  eventLocation: string;
  missingSkill: string;
  urgency: BeaconUrgency;
  active: boolean;
  createdAt: Date;
}

const BeaconSchema = new Schema<IBeacon>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventLocation: { type: String, required: true, trim: true },
    missingSkill: { type: String, required: true, trim: true },
    urgency: { type: String, enum: ["High", "Critical"], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

BeaconSchema.index({ createdAt: 1 }, { expireAfterSeconds: 12 * 60 * 60 });
BeaconSchema.index({ active: 1, urgency: 1, createdAt: -1 });

const Beacon: Model<IBeacon> =
  (mongoose.models.Beacon as Model<IBeacon> | undefined) ??
  mongoose.model<IBeacon>("Beacon", BeaconSchema);

export default Beacon;