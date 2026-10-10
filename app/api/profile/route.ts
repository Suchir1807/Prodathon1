import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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
    isProfileComplete: Boolean(user.isProfileComplete),
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
    const user = await User.findOne({ username }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(profileBody(user));
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
    const body = (await request.json()) as {
      displayName?: string;
      skillsHave?: unknown;
      skillsLearn?: unknown;
      domainInterests?: unknown;
    };

    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim().slice(0, 60) : "";
    const skillsHave = asStringList(body.skillsHave);
    const skillsLearn = asStringList(body.skillsLearn);
    const domainInterests = asStringList(body.domainInterests);

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
