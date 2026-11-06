import mongoose, { type Model, Schema, Types } from "mongoose";

export interface ISubmission {
  quest: Types.ObjectId;
  submittedBy: Types.ObjectId;
  repositoryUrl: string;
  demoUrl: string;
  writeUp: string;
  status: "pending_review" | "changes_requested" | "approved";
  idempotencyKey?: string;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    quest: { type: Schema.Types.ObjectId, ref: "Quest", required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    repositoryUrl: { type: String, required: true, maxlength: 500 },
    demoUrl: { type: String, required: true, maxlength: 500 },
    writeUp: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ["pending_review", "changes_requested", "approved"], default: "pending_review" },
    idempotencyKey: { type: String, maxlength: 100 },
  },
  { timestamps: true },
);

SubmissionSchema.index({ quest: 1, createdAt: -1 });
SubmissionSchema.index(
  { quest: 1, submittedBy: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

const Submission: Model<ISubmission> =
  (mongoose.models.Submission as Model<ISubmission> | undefined) ??
  mongoose.model<ISubmission>("Submission", SubmissionSchema);

export default Submission;
