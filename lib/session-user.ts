import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User, { type IUser } from "@/models/User";

export async function getSessionUsername() {
  const session = await getServerSession(authOptions);
  return session?.user?.name?.trim().toLowerCase() ?? null;
}

export async function getCurrentUser() {
  const username = await getSessionUsername();
  if (!username) return null;
  await connectDB();
  return User.findOne({ username });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  return user;
}

export function publicUserSummary(user: {
  _id: { toString(): string };
  username: string;
  displayName?: string;
  skillsHave?: string[];
  skillsLearn?: string[];
  domainInterests?: string[];
}) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName ?? "",
    skillsHave: user.skillsHave ?? [],
    skillsLearn: user.skillsLearn ?? [],
    domainInterests: user.domainInterests ?? [],
  };
}
