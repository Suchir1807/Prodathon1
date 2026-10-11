import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { FollowButton } from "@/components/follow-button";
import { UserAvatar } from "@/components/user-avatar";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { formatUsername } from "@/lib/profile";
import User from "@/models/User";

export const metadata: Metadata = { title: "Founder Profile" };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const session = await getServerSession(authOptions);
  const username = session?.user?.name?.trim().toLowerCase();
  await connectDB();
  const [user, viewer] = await Promise.all([
    User.findById(id).select("username displayName skillsHave skillsLearn domainInterests followers").lean(),
    username ? User.findOne({ username }).select("_id").lean() : null,
  ]);
  if (!user) notFound();

  const name = user.displayName?.trim() || formatUsername(user.username);
  const isSelf = viewer?._id.toString() === user._id.toString();
  const isFollowing = Boolean(
    viewer && (user.followers ?? []).some((followerId) => followerId.toString() === viewer._id.toString()),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section className="glass rounded-xl border border-white/8 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar name={name} className="size-16 text-base" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-white">{name}</h1>
              <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
              <p className="mt-2 text-xs text-slate-500">
                {(user.followers ?? []).length} {(user.followers ?? []).length === 1 ? "follower" : "followers"}
              </p>
            </div>
          </div>
          {!isSelf && viewer ? (
            <FollowButton targetUserId={user._id.toString()} initialFollowing={isFollowing} />
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <SkillList title="Can teach" skills={user.skillsHave ?? []} />
          <SkillList title="Wants to learn" skills={user.skillsLearn ?? []} />
          <SkillList title="Domains" skills={user.domainInterests ?? []} />
        </div>
      </section>
    </div>
  );
}

function SkillList({ title, skills }: { title: string; skills: string[] }) {
  return (
    <section>
      <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? skills.map((skill) => (
          <span key={skill} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-200">
            {skill}
          </span>
        )) : <span className="text-xs text-slate-600">Not added</span>}
      </div>
    </section>
  );
}