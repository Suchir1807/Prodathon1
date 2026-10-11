import mongoose, { type Model, Schema, Types } from "mongoose";

export type WorkspaceType = "barter" | "sprint";
export type WorkspaceTaskStatus = "todo" | "doing" | "done";

export interface IWorkspaceTask {
  id: string;
  title: string;
  status: WorkspaceTaskStatus;
}

export interface IWorkspace {
  users: Types.ObjectId[];
  type: WorkspaceType;
  referenceId: Types.ObjectId;
  scratchpad: string;
  tasks: IWorkspaceTask[];
  expiresAt: Date;
}

const WorkspaceTaskSchema = new Schema<IWorkspaceTask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      default: "todo",
    },
  },
  { _id: false },
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (users: Types.ObjectId[]) => users.length === 2,
        message: "A workspace must have exactly two users",
      },
    },
    type: { type: String, enum: ["barter", "sprint"], required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    scratchpad: { type: String, default: "" },
    tasks: { type: [WorkspaceTaskSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

WorkspaceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Workspace: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace> | undefined) ??
  mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);

export default Workspace;