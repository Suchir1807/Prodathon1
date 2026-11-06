import mongoose, { type Model, Schema, Types } from "mongoose";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskRole = "A" | "B" | "shared";

export interface ITask {
  quest: Types.ObjectId;
  title: string;
  role: TaskRole;
  assignee: Types.ObjectId | null;
  status: TaskStatus;
  order: number;
  priority: number;
  createdBy: Types.ObjectId;
  idempotencyKey?: string;
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    role: { type: String, enum: ["A", "B", "shared"], default: "shared" },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    order: { type: Number, default: 0, min: 0 },
    priority: { type: Number, default: 3, min: 1, max: 5 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    idempotencyKey: { type: String, maxlength: 100 },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

TaskSchema.index({ quest: 1, status: 1, order: 1 });
TaskSchema.index({ quest: 1, assignee: 1 });
TaskSchema.index(
  { quest: 1, createdBy: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

const Task: Model<ITask> =
  (mongoose.models.Task as Model<ITask> | undefined) ??
  mongoose.model<ITask>("Task", TaskSchema);

export default Task;
