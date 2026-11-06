import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { ensureCreditAccount, getCreditBalance } from "@/lib/credit-balance";
import Session from "@/models/Session";
import SkillBadge from "@/models/SkillBadge";
import { profileSchema } from "@/lib/validation/schemas";
import User from "@/models/User";

type PopulatedProfileUser = {
  _id: Types.ObjectId;
  username?: string;
  displayName?: string;
  name?: string;
  avatar?: string;
};

function serializeSocialUsers(users: PopulatedProfileUser[] | undefined) {
  return (users ?? []).map((user) => ({
    id: user._id.toString(),
    username: user.username ?? "",
    displayName: user.displayName?.trim() || user.name?.trim() || user.username || "",
    avatar: user.avatar ?? null,
  }));
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileBody(user: {
  displayName?: string | null;
  skillsHave?: string[] | null;
  skillsLearn?: string[] | null;
  domainInterests?: string[] | null;
  isProfileComplete?: boolean | null;
  username?: string;
}) {
  return {
    username: user.username ?? "",
    displayName: user.displayName ?? "",
    skillsHave: asStringList(user.skillsHave),
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
      .select("username displayName skillsHave skillsLearn domainInterests isProfileComplete followers following")
      .populate<{ followers: PopulatedProfileUser[] }>(
        "followers",
        "name avatar username displayName",
      )
      .populate<{ following: PopulatedProfileUser[] }>(
        "following",
        "name avatar username displayName",
      )
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followers = serializeSocialUsers(user.followers);
    const following = serializeSocialUsers(user.following);
    await ensureCreditAccount(user._id);
    const [sessions, badges, creditBalance] = await Promise.all([
      Session.countDocuments({ participants: user._id, status: "completed" }),
      SkillBadge.find({ userId: user._id })
        .sort({ earnedAt: -1 })
        .limit(30)
        .populate("sessionId", "topic")
        .lean(),
      getCreditBalance(user._id),
    ]);
    return NextResponse.json({
      ...profileBody(user),
      socialStats: {
        sessions,
        followers: followers.length,
        following: following.length,
      },
      creditBalance,
      socialUsers: { followers, following },
      badges: badges.map((badge) => ({
        id: badge._id.toString(),
        skill: badge.skill,
        sessionTopic: (badge.sessionId as unknown as { topic?: string } | null)?.topic ?? "Completed Session",
        verifiedAt: badge.earnedAt.toISOString(),
      })),
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
    const { displayName, skillsHave, skillsLearn, domainInterests } = result.data;

    await connectDB();
    const user = await User.findOneAndUpdate(
      { username: session?.user?.name?.trim().toLowerCase() },
      {
        displayName,
        skillsHave,
        skillsLearn,
        domainInterests,
        isProfileComplete: true,
      },
      { new: true },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
