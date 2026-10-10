import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  isProfileComplete: boolean;
  partnerId?: Types.ObjectId | null;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    displayName: { type: String, default: "" },
    isProfileComplete: { type: Boolean, default: false },
    skillsHave: { type: [String], default: [] },
    skillsLearn: { type: [String], default: [] },
    domainInterests: { type: [String], default: [] },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, strict: true },
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", UserSchema);

export default User;
