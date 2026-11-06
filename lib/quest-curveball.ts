import mongoose from "mongoose";

import { createQuestNotification } from "@/lib/quest-access";
import Quest from "@/models/Quest";
import Task from "@/models/Task";

export async function unlockQuestCurveball(
  questId: mongoose.Types.ObjectId,
  triggeringUserId: mongoose.Types.ObjectId,
) {
  const quest = await Quest.findOneAndUpdate(
    {
      _id: questId,
      status: "active",
      startedAt: { $ne: null },
      "curveball.taskAdded": false,
      $expr: {
        $gte: [
          new Date(),
          { $add: ["$startedAt", { $multiply: ["$curveball.unlockHour", 3_600_000] }] },
        ],
      },
    },
    { $set: { "curveball.unlockedAt": new Date() } },
    { returnDocument: "after" },
  );
  if (!quest) return false;

  const firstMember = quest.members[0];
  if (!firstMember) return false;
  const key = `curveball:${quest._id}`;
  await Task.findOneAndUpdate(
    { quest: quest._id, idempotencyKey: key },
    {
      $setOnInsert: {
        quest: quest._id,
        title: quest.curveball.text,
        role: "shared",
        assignee: null,
        status: "todo",
        order: (await Task.countDocuments({ quest: quest._id })) + 1,
        priority: 2,
        createdBy: firstMember.user,
        idempotencyKey: key,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  await Quest.updateOne({ _id: quest._id, "curveball.taskAdded": false }, { $set: { "curveball.taskAdded": true } });
  await Promise.all(quest.members.map((member) => createQuestNotification({
    recipient: member.user,
    sender: triggeringUserId,
    type: "curveball_unlocked",
    questId: quest._id,
    dedupeKey: `curveball-unlocked:${quest._id}:${member.user}`,
  })));
  return true;
}
