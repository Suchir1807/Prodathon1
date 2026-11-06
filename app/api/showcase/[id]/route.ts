import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Showcase from "@/models/Showcase";
import Submission from "@/models/Submission";
import Quest from "@/models/Quest";
import User from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await connectDB();
    const showcase = await Showcase.findOne({ publicId: id, visibility: "public" }).lean();
    if (!showcase) return NextResponse.json({ error: "Showcase not found." }, { status: 404 });
    const [quest, submission, review] = await Promise.all([
      Quest.findById(showcase.quest).lean(),
      Submission.findById(showcase.submission).lean(),
      Review.findOne({ quest: showcase.quest, decision: "approved" }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!quest || !submission) return NextResponse.json({ error: "Showcase data is unavailable." }, { status: 404 });
    const users = await User.find({ _id: { $in: quest.members.map((member) => member.user) } })
      .select("_id username displayName skillsHave")
      .lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    return NextResponse.json({
      showcase: {
        id: showcase.publicId,
        createdAt: showcase.createdAt.toISOString(),
        quest: {
          id: quest._id.toString(),
          title: quest.title,
          brief: quest.brief,
          skillsUsed: quest.skillsUsed,
          completedAt: quest.updatedAt.toISOString(),
        },
        partners: quest.members.map((member) => {
          const user = userMap.get(member.user.toString());
          return user
            ? {
                id: user._id.toString(),
                username: user.username,
                displayName: user.displayName || user.username,
                skills: user.skillsHave,
                role: member.role,
              }
            : null;
        }).filter(Boolean),
        submission: {
          repositoryUrl: submission.repositoryUrl,
          demoUrl: submission.demoUrl,
          writeUp: submission.writeUp,
        },
        review: review
          ? { rating: review.rating, feedback: review.feedback, createdAt: review.createdAt.toISOString() }
          : null,
      },
    });
  } catch (error) {
    console.error("Showcase GET error:", error);
    return NextResponse.json({ error: "Unable to load showcase." }, { status: 500 });
  }
}
