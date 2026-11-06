import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { createQuestNotification, findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { reviewSchema } from "@/lib/validation/schemas";
import Badge from "@/models/Badge";
import Quest from "@/models/Quest";
import Review from "@/models/Review";
import Showcase from "@/models/Showcase";
import Submission from "@/models/Submission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  }

  try {
    const connection = await connectDB();
    const session = await connection.startSession();
    let reviewId = "";
    let submissionId = "";
    let completed = false;
    try {
      await session.withTransaction(async () => {
        const quest = await Quest.findById(access.quest._id).session(session);
        if (!quest || !quest.submissionId) {
          throw new Error("QUEST_NOT_REVIEWABLE");
        }
        const reviewerIsMember = quest.members.some((member) => member.user.equals(access.current._id));
        const submission = await Submission.findById(quest.submissionId).session(session);
        if (!reviewerIsMember || !submission) throw new Error("SUBMISSION_NOT_FOUND");
        if (submission.submittedBy.equals(access.current._id)) throw new Error("CANNOT_REVIEW_OWN_WORK");
        const prior = await Review.findOne({
          submission: submission._id,
          reviewer: access.current._id,
        }).session(session);
        if (prior) {
          reviewId = prior._id.toString();
          submissionId = submission._id.toString();
          completed = quest.status === "completed";
          return;
        }
        if (!["submitted", "reviewed"].includes(quest.status)) {
          throw new Error("QUEST_NOT_REVIEWABLE");
        }
        const [review] = await Review.create([{
          quest: quest._id,
          submission: submission._id,
          reviewer: access.current._id,
          ...parsed.data,
        }], { session });
        submission.status = parsed.data.decision === "approved" ? "approved" : "changes_requested";
        quest.reviewId = review._id;
        if (parsed.data.decision === "approved") {
          quest.status = "completed";
          const showcaseExists = await Showcase.findOne({ quest: quest._id }).session(session);
          if (!showcaseExists) {
            await Showcase.create([{
              quest: quest._id,
              submission: submission._id,
              publicId: randomUUID(),
              visibility: "public",
            }], { session });
          }
          const badges = quest.members.flatMap((member) =>
            quest.skillsUsed.map((skill) => ({
              user: member.user,
              quest: quest._id,
              skill,
              submission: submission._id,
              review: review._id,
              verifiedAt: new Date(),
            })),
          );
          if (badges.length) await Badge.insertMany(badges, { session, ordered: false });
        } else {
          quest.status = "changes_requested";
        }
        await submission.save({ session });
        await quest.save({ session });
        reviewId = review._id.toString();
        submissionId = submission._id.toString();
        completed = quest.status === "completed";
      });
    } finally {
      await session.endSession();
    }

    if (submissionId) {
      const partner = access.quest.members.find((member) => !member.user.equals(access.current._id));
      if (partner) {
        await createQuestNotification({
          recipient: partner.user,
          sender: access.current._id,
          type: "review",
          questId: access.quest._id,
          resourceId: new mongoose.Types.ObjectId(reviewId),
          dedupeKey: `review:${reviewId}:${partner.user}`,
        });
      }
    }
    return NextResponse.json({ reviewId, completed, status: parsed.data.decision === "approved" ? "completed" : "changes_requested" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUEST_NOT_REVIEWABLE") return NextResponse.json({ error: "There is no submission awaiting review." }, { status: 409 });
    if (message === "SUBMISSION_NOT_FOUND") return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (message === "CANNOT_REVIEW_OWN_WORK") return NextResponse.json({ error: "You cannot review your own submission." }, { status: 403 });
    console.error("Quest review error:", error);
    return NextResponse.json({ error: "Unable to save review." }, { status: 500 });
  }
}
