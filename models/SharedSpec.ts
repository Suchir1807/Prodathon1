import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISpecVersion {
  content: string;
  revision: number;
  editor: Types.ObjectId;
  editedAt: Date;
}

export interface ISharedSpec {
  quest: Types.ObjectId;
  content: string;
  revision: number;
  editor: Types.ObjectId;
  history: ISpecVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema = new Schema<ISpecVersion>(
  {
    content: { type: String, required: true, maxlength: 200_000 },
    revision: { type: Number, required: true },
    editor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    editedAt: { type: Date, required: true },
  },
  { _id: false },
);

const SharedSpecSchema = new Schema<ISharedSpec>(
  {
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true, unique: true },
    content: { type: String, default: "", maxlength: 200_000 },
    revision: { type: Number, default: 0 },
    editor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    history: { type: [VersionSchema], default: [] },
  },
  { timestamps: true },
);

const SharedSpec: Model<ISharedSpec> =
  (mongoose.models.SharedSpec as Model<ISharedSpec> | undefined) ??
  mongoose.model<ISharedSpec>("SharedSpec", SharedSpecSchema);

export default SharedSpec;
