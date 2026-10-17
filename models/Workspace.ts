import mongoose, { type Model, Schema, Types } from "mongoose";

export type WorkspaceType = "barter" | "sprint";
export type WorkspaceStatus = "active" | "completed" | "abandoned";
export type WorkspaceTaskStatus = "todo" | "doing" | "done";

export interface IWorkspaceTask {
  id: string;
  title: string;
  status: WorkspaceTaskStatus;
  priority?: number;
}

export interface IWorkspace {
  users: Types.ObjectId[];
  type: WorkspaceType;
  status: WorkspaceStatus;
  referenceId: Types.ObjectId;
  referenceModel: "Barter" | "Sprint";
  scratchpad: string;
  tasks: IWorkspaceTask[];
  expiresAt?: Date;
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
    priority: { type: Number, min: 1, max: 5 },
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
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "referenceModel",
    },
    referenceModel: { type: String, enum: ["Barter", "Sprint"], required: true },
    scratchpad: { type: String, default: "" },
    tasks: { type: [WorkspaceTaskSchema], default: [] },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

WorkspaceSchema.index({ expiresAt: 1 }, { name: "workspace_expiry_lookup" });
WorkspaceSchema.index({ users: 1, expiresAt: 1 });

const Workspace: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace> | undefined) ??
  mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);

export default Workspace;