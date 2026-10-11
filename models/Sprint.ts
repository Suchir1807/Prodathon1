import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISprint {
  users: Types.ObjectId[];
  startedAt: Date;
  expiresAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (users: Types.ObjectId[]) => users.length === 2,
        message: "A sprint must have exactly two users",
      },
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

const Sprint: Model<ISprint> =
  (mongoose.models.Sprint as Model<ISprint> | undefined) ??
  mongoose.model<ISprint>("Sprint", SprintSchema);

export default Sprint;