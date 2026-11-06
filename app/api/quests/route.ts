import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Quest from "@/models/Quest";
import Task from "@/models/Task";

export async function GET() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const quests = await Quest.find({ "members.user": current._id })
      .sort({ updatedAt: -1 })
      .populate("members.user", "username displayName")
      .lean();
    const counts = await Task.aggregate([
      { $match: { quest: { $in: quests.map((quest) => quest._id) } } },
      { $group: { _id: { quest: "$quest", status: "$status" }, count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, Record<string, number>>();
    for (const item of counts) {
      const questId = item._id.quest.toString();
      const entry = countMap.get(questId) ?? {};
      entry[item._id.status] = item.count;
      countMap.set(questId, entry);
    }
    return NextResponse.json({
      quests: quests.map((quest) => ({
        id: quest._id.toString(),
        title: quest.title,
        brief: quest.brief,
        status: quest.status,
        startedAt: quest.startedAt?.toISOString() ?? null,
        deadline: quest.deadline?.toISOString() ?? null,
        members: quest.members.map((member) => {
          const user = member.user as unknown as { _id: { toString(): string }; username: string; displayName?: string };
          return {
            id: user._id.toString(),
            username: user.username,
            displayName: user.displayName ?? "",
            role: member.role,
            acceptedAt: member.acceptedAt?.toISOString() ?? null,
          };
        }),
        taskCounts: countMap.get(quest._id.toString()) ?? { todo: 0, doing: 0, done: 0 },
      })),
    });
  } catch (error) {
    console.error("Quests GET error:", error);
    return NextResponse.json({ error: "Unable to load quests." }, { status: 500 });
  }
}
