import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Star, Flame, Clock3, BadgeCheck } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { formatUsername } from "@/lib/profile";
import CreditLedger from "@/models/CreditLedger";
import CreditAccount from "@/models/CreditAccount";
import Session from "@/models/Session";
import SessionReview from "@/models/SessionReview";
import SkillBadge from "@/models/SkillBadge";
import User from "@/models/User";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `${formatUsername(username)}'s Profile` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLocaleLowerCase();
  await connectDB();
  const [user, viewerSession] = await Promise.all([
    User.findOne({ username })
      .select("username displayName bio")
      .lean(),
    getServerSession(authOptions),
  ]);
  if (!user) notFound();

  const viewerName = viewerSession?.user?.name?.trim().toLocaleLowerCase();
  const viewer = viewerName ? await User.findOne({ username: viewerName }).select("_id username displayName").lean() : null;
  const isSelf = viewer?._id.equals(user._id) ?? false;
  const name = user.displayName?.trim() || formatUsername(user.username);
  const [sessions, badges, reviews, account, ledger] = await Promise.all([
    Session.find({ participants: user._id, status: "completed" }).select("_id completedAt").sort({ completedAt: -1 }).lean(),
    SkillBadge.find({ userId: user._id }).select("skill sessionId earnedAt").sort({ earnedAt: -1 }).limit(100).lean(),
    SessionReview.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("reviewerId", "username displayName")
      .populate("sessionId", "topic")
      .lean(),
    CreditAccount.findOne({ userId: user._id }).select("balance").lean(),
    CreditLedger.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const completedIds = new Set(sessions.map((session) => session._id.toString()));
  const verified = badges.filter((badge) => completedIds.has(badge.sessionId.toString()));
  const badgeGroups = new Map<string, Set<string>>();
  for (const badge of verified) {
    const key = badge.skill.trim();
    const entries = badgeGroups.get(key) ?? new Set<string>();
    entries.add(badge.sessionId.toString());
    badgeGroups.set(key, entries);
  }
  const reviewBySession = new Map<string, number[]>();
  for (const review of reviews) {
    const sessionId = (review.sessionId as unknown as { _id?: { toString(): string } } | null)?._id?.toString();
    if (!sessionId) continue;
    reviewBySession.set(sessionId, [...(reviewBySession.get(sessionId) ?? []), review.rating]);
  }
  const overallRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
  const sessionsWithViewer = viewer && !isSelf
    ? await Session.find({
        participants: { $all: [user._id, viewer._id] },
        status: { $in: ["scheduled", "completed"] },
      }).countDocuments()
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <UserAvatar name={name} className="size-16 text-base" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold text-white">{name}</h1>
            <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
            {user.bio ? <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{user.bio}</p> : null}
            {sessionsWithViewer > 0 ? <p className="mt-3 text-xs text-emerald-200">{ordinalSuffix(sessionsWithViewer)} session with {viewer?.displayName?.trim() || (viewer ? formatUsername(viewer.username) : "you")}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <StatsCard label="Credits" value={String(account?.balance ?? 0)} />
          <StatsCard label="Sessions" value={String(sessions.length)} />
          <StatsCard label="Rating" value={overallRating ? `${overallRating.toFixed(1)} / 5` : "New"} />
          <StatsCard label="Streak" value={`${calculateStreak(sessions.map((item) => item.completedAt ?? item._id.getTimestamp()))} days`} />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><BadgeCheck className="size-4 text-emerald-200" />Verified skills</h2>
          <p className="mt-1 text-xs text-slate-500">Skills recognized in completed, reviewed Sessions.</p>
          <div className="mt-4 space-y-3">
            {badgeGroups.size ? [...badgeGroups].map(([skill, sessionIds]) => {
              const skillRatings = [...sessionIds].flatMap((id) => reviewBySession.get(id) ?? []);
              const average = skillRatings.length
                ? skillRatings.reduce((sum, rating) => sum + rating, 0) / skillRatings.length
                : 0;
              return (
                <div key={skill} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] p-3">
                  <span className="text-sm text-emerald-100">{skill}</span>
                  <span className="text-xs text-slate-400">{sessionIds.size} sessions · {average ? `${average.toFixed(1)} average` : "rating pending"}</span>
                </div>
              );
            }) : <p className="text-sm text-slate-500">Verified skills appear after a completed Session receives a review.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="size-4 text-sky-200" />Recent credit ledger</h2>
          <div className="mt-4 space-y-2">
            {ledger.length ? ledger.map((entry) => (
              <div key={entry._id.toString()} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">{ledgerLabel(entry.type)}</span>
                <span className={entry.amount >= 0 ? "text-emerald-200" : "text-rose-200"}>{entry.amount > 0 ? "+" : ""}{entry.amount} min</span>
              </div>
            )) : <p className="text-sm text-slate-500">No credit activity yet.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Star className="size-4 text-amber-200" />Received reviews</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reviews.length ? reviews.map((review) => {
            const reviewer = review.reviewerId as unknown as { username?: string; displayName?: string } | null;
            const session = review.sessionId as unknown as { topic?: string } | null;
            return (
              <article key={review._id.toString()} className="rounded-xl border border-white/8 p-3">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-medium text-white">{reviewer?.displayName?.trim() || reviewer?.username || "Skillin member"}</p>
                  <span className="text-xs text-amber-100">{review.rating}/5</span>
                </div>
                {session?.topic ? <p className="mt-1 text-[11px] text-slate-500">{session.topic}</p> : null}
                <p className="mt-2 text-sm leading-5 text-slate-300">{review.feedback || "Quick review received."}</p>
              </article>
            );
          }) : <p className="text-sm text-slate-500">Reviews appear here after completed Sessions.</p>}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Flame className="size-3.5" />Public overview · earned skills and learning activity</div>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>;
}

function calculateStreak(dates: Date[]) {
  const days = new Set(dates.map((date) => {
    const value = new Date(date);
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  }));
  let date = new Date();
  date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (!days.has(date.getTime())) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (days.has(date.getTime())) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function ordinalSuffix(count: number) {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (count % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function ledgerLabel(type: string) {
  return type.replaceAll("_", " ");
}
