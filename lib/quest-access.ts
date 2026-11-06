import mongoose from "mongoose";

import { requireCurrentUser } from "@/lib/session-user";
import Quest from "@/models/Quest";
import type { IQuest } from "@/models/Quest";

export async function findQuestAccess(id: string) {
  const current = await requireCurrentUser();
  if (!current) return { error: "Sign in to open this quest.", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "This quest link is invalid.", status: 400 as const };
  }
  const quest = await Quest.findById(id);
  if (!quest) return { error: "Quest not found.", status: 404 as const };
  if (!quest.members.some((member) => member.user.equals(current._id))) {
    return { error: "You are not a member of this quest.", status: 403 as const };
  }
  return { current, quest };
}

export function questMember(quest: IQuest, userId: mongoose.Types.ObjectId) {
  return quest.members.find((member) => member.user.equals(userId)) ?? null;
}

export async function createQuestNotification({
  recipient,
  sender,
  type,
  questId,
  resourceId,
  dedupeKey,
}: {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: "partner_request" | "request_accepted" | "quest_ready" | "task_completed" | "new_message" | "curveball_unlocked" | "submission" | "review";
  questId?: mongoose.Types.ObjectId;
  resourceId?: mongoose.Types.ObjectId;
  dedupeKey: string;
}) {
  const { default: Notification } = await import("@/models/Notification");
  await Notification.updateOne(
    { recipient, dedupeKey },
    {
      $setOnInsert: {
        recipient,
        sender,
        type,
        ...(questId ? { questId } : {}),
        ...(resourceId ? { resourceId } : {}),
        dedupeKey,
      },
    },
    { upsert: true },
  );
}

export function serializeQuest(quest: IQuest & { _id: mongoose.Types.ObjectId }, currentId: mongoose.Types.ObjectId) {
  const ownMember = questMember(quest, currentId);
  const otherMember = quest.members.find((member) => !member.user.equals(currentId));
  return {
    id: quest._id.toString(),
    title: quest.title,
    brief: quest.brief,
    status: quest.status,
    generationSource: quest.generationSource,
    skillsUsed: quest.skillsUsed,
    roles: quest.roles,
    curveball: {
      unlockHour: quest.curveball.unlockHour,
      unlocked: Boolean(quest.curveball.unlockedAt),
      ...(quest.curveball.unlockedAt
        ? { text: quest.curveball.text }
        : {}),
    },
    stretchGoal: quest.stretchGoal,
    startedAt: quest.startedAt?.toISOString() ?? null,
    deadline: quest.deadline?.toISOString() ?? null,
    myRole: ownMember?.role ?? null,
    acceptedByMe: Boolean(ownMember?.acceptedAt),
    partnerAccepted: Boolean(otherMember?.acceptedAt),
    members: quest.members.map((member) => ({
      userId: member.user.toString(),
      role: member.role,
      acceptedAt: member.acceptedAt?.toISOString() ?? null,
    })),
    createdAt: quest.createdAt.toISOString(),
    updatedAt: quest.updatedAt.toISOString(),
  };
}
