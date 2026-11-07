import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { ensureCreditAccount, getCreditBalance } from "@/lib/credit-balance";
import Session from "@/models/Session";
import SkillBadge from "@/models/SkillBadge";
import SessionReview from "@/models/SessionReview";
import CreditLedger from "@/models/CreditLedger";
import { profileSchema } from "@/lib/validation/schemas";
import User from "@/models/User";

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileBody(user: {
  displayName?: string | null;
  bio?: string | null;
  skillsHave?: string[] | null;
  skillsHaveLevels?: Map<string, string> | Record<string, string> | null;
  skillsLearn?: string[] | null;
  domainInterests?: string[] | null;
  isProfileComplete?: boolean | null;
  username?: string;
}) {
  return {
    username: user.username ?? "",
    displayName: user.displayName ?? "",
    bio: user.bio ?? "",
    skillsHave: asStringList(user.skillsHave),
    skillsHaveLevels: user.skillsHaveLevels instanceof Map
      ? Object.fromEntries(user.skillsHaveLevels)
      : user.skillsHaveLevels ?? {},
    skillsLearn: asStringList(user.skillsLearn),
    domainInterests: asStringList(user.domainInterests),
    isProfileComplete: Boolean(user.isProfileComplete && user.skillsHave?.length && user.skillsLearn?.length),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ username })
      .select("username displayName bio skillsHave skillsHaveLevels skillsLearn domainInterests isProfileComplete followers following timezone")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await ensureCreditAccount(user._id);
    const [completedSessions, badges, creditBalance, ledger, receivedReviews] = await Promise.all([
      Session.find({ participants: user._id, status: "completed" }).select("_id completedAt").sort({ completedAt: -1 }).lean(),
      SkillBadge.find({ userId: user._id })
        .sort({ earnedAt: -1 })
        .limit(30)
        .lean(),
      getCreditBalance(user._id),
      CreditLedger.find({ userId: user._id }).sort({ createdAt: -1 }).limit(8).lean(),
      SessionReview.find({ recipientId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("reviewerId", "username displayName")
        .populate("sessionId", "topic")
        .lean(),
    ]);
    const sessions = completedSessions.length;
    const averageRating = receivedReviews.length
      ? receivedReviews.reduce((sum, review) => sum + review.rating, 0) / receivedReviews.length
      : 0;
    const completedIds = new Set(completedSessions.map((item) => item._id.toString()));
    const verifiedBadges = badges.filter((badge) => completedIds.has(badge.sessionId.toString()));
    const skillSessions = new Map<string, Set<string>>();
    for (const badge of verifiedBadges) {
      const sessionIds = skillSessions.get(badge.skill) ?? new Set<string>();
      sessionIds.add(badge.sessionId.toString());
      skillSessions.set(badge.skill, sessionIds);
    }
    const ratingsBySession = new Map<string, number[]>();
    for (const review of receivedReviews) {
      const sessionId = (review.sessionId as unknown as { _id?: Types.ObjectId } | null)?._id?.toString();
      if (sessionId) ratingsBySession.set(sessionId, [...(ratingsBySession.get(sessionId) ?? []), review.rating]);
    }
    const streak = calculateStreak(completedSessions.map((item) => item.completedAt ?? new Date(0)));
    return NextResponse.json({
      ...profileBody(user),
      socialStats: {
        sessions,
      },
      rating: averageRating,
      streak,
      creditBalance,
      timezone: user.timezone ?? "UTC",
      ledger: ledger.map((entry) => ({
        id: entry._id.toString(),
        amount: entry.amount,
        type: entry.type,
        createdAt: entry.createdAt.toISOString(),
      })),
      badges: verifiedBadges.map((badge) => ({
        id: badge._id.toString(),
        skill: badge.skill,
        sessionTopic: "Completed Session",
        verifiedAt: badge.earnedAt.toISOString(),
      })),
      verifiedSkills: [...skillSessions].map(([skill, sessionIds]) => {
        const ratings = [...sessionIds].flatMap((id) => ratingsBySession.get(id) ?? []);
        return {
          skill,
          sessionCount: sessionIds.size,
          averageRating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
        };
      }),
      reviews: receivedReviews.map((review) => {
        const reviewer = review.reviewerId as unknown as { username?: string; displayName?: string } | null;
        const sessionInfo = review.sessionId as unknown as { topic?: string } | null;
        return {
          id: review._id.toString(),
          reviewerName: reviewer?.displayName?.trim() || reviewer?.username || "Skillin member",
          topic: sessionInfo?.topic ?? "Completed Session",
          rating: review.rating,
          feedback: review.feedback,
          createdAt: review.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid profile details." },
        { status: 400 },
      );
    }
    const { displayName, bio, skillsHave, skillsHaveLevels, skillsLearn, domainInterests, timezone } = result.data;

    await connectDB();
    const user = await User.findOneAndUpdate(
      { username: session?.user?.name?.trim().toLowerCase() },
      {
        displayName,
        bio,
        skillsHave,
        skillsHaveLevels,
        skillsLearn,
        domainInterests: domainInterests ?? [],
        timezone,
        isProfileComplete: true,
      },
      { new: true },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    function calculateStreak(dates: Date[]) {
      const days = new Set(dates.map((date) => {
        const day = new Date(date);
        return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      }));
      let cursor = new Date();
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (days.has(cursor.getTime())) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }

    return NextResponse.json({
      ok: true,
      ...profileBody(user),
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Unable to save profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
