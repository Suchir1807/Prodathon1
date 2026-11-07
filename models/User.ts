import mongoose, { type Model, Schema, Types } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  displayName: string;
  bio: string;
  skillsHave: string[];
  skillsHaveLevels: Map<string, string>;
  skillsLearn: string[];
  domainInterests: string[];
  isProfileComplete: boolean;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  availableUntil: Date | null;
  availableFor: string[];
  lastSeen: Date | null;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyHelpNowLimit: number;
  helpNowCancelCount: number;
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
    bio: { type: String, default: "", maxlength: 500 },
    isProfileComplete: { type: Boolean, default: false },
    skillsHave: { type: [String], default: [] },
    skillsHaveLevels: { type: Map, of: String, default: {} },
    skillsLearn: { type: [String], default: [] },
    domainInterests: { type: [String], default: [] },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    availableUntil: { type: Date, default: null },
    availableFor: { type: [String], default: [] },
    lastSeen: { type: Date, default: null },
    timezone: { type: String, default: "UTC", maxlength: 80 },
    quietHoursStart: { type: String, default: "" },
    quietHoursEnd: { type: String, default: "" },
    dailyHelpNowLimit: { type: Number, min: 1, max: 20, default: 5 },
    helpNowCancelCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, strict: true },
);

UserSchema.index({ skillsHave: 1, username: 1 });

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", UserSchema);

export default User;
