import { NextResponse } from "next/server";

import { findQuestAccess, serializeQuest } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { unlockQuestCurveball } from "@/lib/quest-curveball";
import Quest from "@/models/Quest";
import Review from "@/models/Review";
import Showcase from "@/models/Showcase";
import Submission from "@/models/Submission";
import SharedSpec from "@/models/SharedSpec";
import Task from "@/models/Task";
import User from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    await unlockQuestCurveball(access.quest._id, access.current._id);
    const quest = await Quest.findById(access.quest._id);
    if (!quest) return NextResponse.json({ error: "Quest not found." }, { status: 404 });
    const [tasks, spec, submission, review, showcase] = await Promise.all([
      Task.find({ quest: quest._id })
        .sort({ order: 1, createdAt: 1 })
        .populate("assignee", "username displayName")
        .populate("completedBy", "username displayName")
        .lean(),
      SharedSpec.findOne({ quest: quest._id })
        .populate("editor", "username displayName")
        .populate("history.editor", "username displayName")
        .lean(),
      quest.submissionId ? Submission.findById(quest.submissionId).lean() : null,
      quest.reviewId ? Review.findById(quest.reviewId).lean() : null,
      Showcase.findOne({ quest: quest._id, visibility: "public" }).select("publicId").lean(),
    ]);
    const users = await User.find({ _id: { $in: quest.members.map((member) => member.user) } })
      .select("_id username displayName")
      .lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    return NextResponse.json({
      quest: {
        ...serializeQuest(quest, access.current._id),
        members: quest.members.map((member) => {
          const user = userMap.get(member.user.toString());
          return {
            userId: member.user.toString(),
            role: member.role,
            acceptedAt: member.acceptedAt?.toISOString() ?? null,
            username: user?.username ?? "",
            displayName: user?.displayName ?? "",
          };
        }),
      },
      tasks: tasks.map((task) => ({
        id: task._id.toString(),
        title: task.title,
        role: task.role,
        assignee: task.assignee
          ? {
              id: (task.assignee as unknown as { _id: { toString(): string } })._id.toString(),
              username: (task.assignee as unknown as { username: string }).username,
              displayName: (task.assignee as unknown as { displayName?: string }).displayName ?? "",
            }
          : null,
        status: task.status,
        order: task.order,
        priority: task.priority,
        completedAt: task.completedAt?.toISOString() ?? null,
      })),
      spec: spec
        ? {
            content: spec.content,
            revision: spec.revision,
            editor: spec.editor
              ? {
                  username: (spec.editor as unknown as { username: string }).username,
                  displayName: (spec.editor as unknown as { displayName?: string }).displayName ?? "",
                }
              : null,
            updatedAt: spec.updatedAt.toISOString(),
            history: spec.history.map((version) => ({
              revision: version.revision,
              content: version.content,
              editedAt: version.editedAt.toISOString(),
              editor: version.editor
                ? {
                    username: (version.editor as unknown as { username: string }).username,
                    displayName: (version.editor as unknown as { displayName?: string }).displayName ?? "",
                  }
                : null,
            })),
          }
        : null,
      submission: submission
        ? {
            id: submission._id.toString(),
            submittedBy: submission.submittedBy.toString(),
            repositoryUrl: submission.repositoryUrl,
            demoUrl: submission.demoUrl,
            writeUp: submission.writeUp,
            status: submission.status,
          }
        : null,
      review: review
        ? {
            rating: review.rating,
            feedback: review.feedback,
            decision: review.decision,
          }
        : null,
      showcaseId: showcase?.publicId ?? null,
    });
  } catch (error) {
    console.error("Quest GET error:", error);
    return NextResponse.json({ error: "Unable to load quest details." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { questAcceptanceSchema } = await import("@/lib/validation/schemas");
  const parsed = questAcceptanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid acceptance." }, { status: 400 });
  }
  try {
    const connection = await connectDB();
    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        const quest = await (await import("@/models/Quest")).default.findById(id).session(session);
        if (!quest) throw new Error("QUEST_NOT_FOUND");
        if (quest.status !== "pending" && quest.status !== "active") throw new Error("QUEST_NOT_ACCEPTING");
        const member = quest.members.find((entry) => entry.user.equals(access.current._id));
        if (!member) throw new Error("NOT_A_MEMBER");
        member.acceptedAt ??= new Date();
        if (quest.members.every((entry) => entry.acceptedAt)) {
          if (quest.status === "pending") {
            const startedAt = new Date();
            quest.status = "active";
            quest.startedAt = startedAt;
            quest.deadline = new Date(startedAt.getTime() + 72 * 60 * 60 * 1000);
          }
        }
        await quest.save({ session });
        access.quest = quest;
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ quest: serializeQuest(access.quest, access.current._id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUEST_NOT_FOUND") return NextResponse.json({ error: "Quest not found." }, { status: 404 });
    if (message === "NOT_A_MEMBER") return NextResponse.json({ error: "You are not a member of this quest." }, { status: 403 });
    if (message === "QUEST_NOT_ACCEPTING") return NextResponse.json({ error: "This quest can no longer be accepted." }, { status: 409 });
    console.error("Quest accept error:", error);
    return NextResponse.json({ error: "Unable to accept quest." }, { status: 500 });
  }
}
