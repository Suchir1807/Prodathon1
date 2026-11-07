import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import HelpOffer from "@/models/HelpOffer";
import HelpRequest from "@/models/HelpRequest";
import HelpSafetyRecord from "@/models/HelpSafetyRecord";
import Notification from "@/models/Notification";
import SessionReview from "@/models/SessionReview";
import User from "@/models/User";
import type { HelpTriage } from "@/lib/ai/help-now";
import { normalizeSkill } from "@/lib/skill-categories";

function isQuietNow(start: string, end: string, timezone: string) {
  if (!start || !end) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const current = Number(parts.find((item) => item.type === "hour")?.value ?? 0) * 60 +
      Number(parts.find((item) => item.type === "minute")?.value ?? 0);
    const toMinutes = (value: string) => {
      const [hour, minute] = value.split(":").map(Number);
      return hour * 60 + minute;
    };
    const from = toMinutes(start);
    const until = toMinutes(end);
    return from < until ? current >= from && current < until : current >= from || current < until;
  } catch {
    return false;
  }
}

export async function rankHelpCandidates(requesterId: mongoose.Types.ObjectId, triage: HelpTriage) {
  const now = new Date();
  const users = await User.find({
    _id: { $ne: requesterId },
    availableUntil: { $gt: now },
  })
    .select("_id skillsHave availableFor timezone quietHoursStart quietHoursEnd dailyHelpNowLimit")
    .lean();
  if (!users.length) return [];

  const skillNeedle = normalizeSkill(triage.skill);
  const tagNeedles = triage.tags.map(normalizeSkill);
  const matching = users.filter((user) => {
    if (isQuietNow(user.quietHoursStart ?? "", user.quietHoursEnd ?? "", user.timezone ?? "UTC")) return false;
    const offered = (user.skillsHave ?? []).map(normalizeSkill);
    const availableFor = (user.availableFor ?? []).map(normalizeSkill);
    const skillMatch = offered.some((skill) =>
      skill.includes(skillNeedle) || skillNeedle.includes(skill) ||
      tagNeedles.some((tag) => skill.includes(tag) || tag.includes(skill)),
    );
    if (!skillMatch) return false;
    return availableFor.length === 0 || availableFor.some((skill) =>
      skill === skillNeedle || skillNeedle.includes(skill) || skill.includes(skillNeedle) ||
      tagNeedles.includes(skill),
    );
  });
  if (!matching.length) return [];

  const ids = matching.map((user) => user._id);
  const sinceMidnight = new Date(now);
  sinceMidnight.setHours(0, 0, 0, 0);
  const [reviews, safetyRecords, acceptedToday] = await Promise.all([
    SessionReview.find({ recipientId: { $in: ids } }).select("recipientId rating").lean(),
    HelpSafetyRecord.find({
      kind: "block",
      $or: [
        { reporterId: requesterId, reportedUserId: { $in: ids } },
        { reportedUserId: requesterId, reporterId: { $in: ids } },
      ],
    }).select("reporterId reportedUserId").lean(),
    HelpOffer.aggregate([
      { $match: { helperId: { $in: ids }, status: "accepted", createdAt: { $gte: sinceMidnight } } },
      { $group: { _id: "$helperId", count: { $sum: 1 } } },
    ]),
  ]);
  const ratingByUser = new Map<string, number[]>();
  for (const review of reviews) {
    const key = review.recipientId.toString();
    ratingByUser.set(key, [...(ratingByUser.get(key) ?? []), review.rating]);
  }
  const blockedPairs = new Set(safetyRecords.map((record) => `${record.reporterId}:${record.reportedUserId}`));
  const acceptedCount = new Map(acceptedToday.map((entry) => [entry._id.toString(), entry.count]));
  return matching
    .filter((user) => {
      const id = user._id.toString();
      const dailyCap = user.dailyHelpNowLimit ?? 5;
      return !blockedPairs.has(`${requesterId}:${id}`) &&
        !blockedPairs.has(`${id}:${requesterId}`) &&
        (acceptedCount.get(id) ?? 0) < dailyCap;
    })
    .map((user) => {
      const ratings = ratingByUser.get(user._id.toString()) ?? [];
      return {
        id: user._id,
        rating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
        ratingCount: ratings.length,
      };
    })
    .filter((candidate) => candidate.ratingCount === 0 || candidate.rating >= 3.5)
    .sort((left, right) =>
      right.rating - left.rating ||
      right.ratingCount - left.ratingCount ||
      left.id.toString().localeCompare(right.id.toString()),
    )
    .slice(0, 5)
    .map((candidate) => candidate.id);
}

export async function offerNextHelpCandidate(requestId: mongoose.Types.ObjectId) {
  const connection = await connectDB();
  const transaction = await connection.startSession();
  try {
    await transaction.withTransaction(async () => {
      const request = await HelpRequest.findById(requestId).session(transaction);
      if (!request || !["searching", "offered"].includes(request.status)) return;
      const now = new Date();
      if (request.currentOfferId) {
        const currentOffer = await HelpOffer.findById(request.currentOfferId).session(transaction);
        if (currentOffer?.status === "pending" && currentOffer.expiresAt > now) return;
        if (currentOffer?.status === "pending") {
          currentOffer.status = "expired";
          currentOffer.respondedAt = now;
          await currentOffer.save({ session: transaction });
        }
      }

      const attempted = new Set(request.attemptedCandidateIds.map((id) => id.toString()));
      const candidateId = request.candidateIds.find((id) => !attempted.has(id.toString()));
      if (!candidateId) {
        request.status = "no_match";
        request.currentOfferId = null;
        await request.save({ session: transaction });
        return;
      }

      const [offer] = await HelpOffer.create([{
        requestId: request._id,
        helperId: candidateId,
        status: "pending",
        expiresAt: new Date(now.getTime() + 90_000),
      }], { session: transaction });
      request.attemptedCandidateIds.push(candidateId);
      request.currentOfferId = offer._id;
      request.status = "offered";
      await request.save({ session: transaction });
      await Notification.create([{
        recipient: candidateId,
        sender: request.requesterId,
        type: "help_now_offer",
        helpRequestId: request._id,
        resourceId: offer._id,
        dedupeKey: `help-now-offer:${offer._id}`,
      }], { session: transaction });
    });
  } finally {
    await transaction.endSession();
  }
}
