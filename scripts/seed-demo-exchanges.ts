import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";

import Ask from "../models/Ask";
import CreditAccount from "../models/CreditAccount";
import CreditLedger from "../models/CreditLedger";
import Exchange from "../models/Exchange";
import ExchangeInvite from "../models/ExchangeInvite";
import Message from "../models/Message";
import Notification from "../models/Notification";
import Session from "../models/Session";
import SessionReview from "../models/SessionReview";
import SessionRoom from "../models/SessionRoom";
import SkillBadge from "../models/SkillBadge";
import User from "../models/User";

loadEnvConfig(process.cwd());

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "SkillinDemo!2026";
async function seed() {
  if (!process.argv.includes("--confirm-demo-seed")) {
    throw new Error("Run with --confirm-demo-seed to create or refresh the Skillin demo accounts and learning data.");
  }
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI environment variable.");

  await mongoose.connect(process.env.MONGODB_URI);
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoProfiles = [
    { username: "demo_a", displayName: "Mira Chen", skillsHave: ["Cooking", "Baking", "Python"], skillsLearn: ["React", "TypeScript"], domainInterests: [] },
    { username: "demo_b", displayName: "Aarav Patel", skillsHave: ["Fitness coaching", "Yoga", "React"], skillsLearn: ["Product design", "Figma"], domainInterests: [] },
    { username: "demo_c", displayName: "Sam Rivera", skillsHave: ["Japanese", "Academic writing"], skillsLearn: ["Public speaking", "Storytelling"], domainInterests: [] },
    { username: "demo_d", displayName: "Nia Okafor", skillsHave: ["Career planning", "Personal finance", "Illustration"], skillsLearn: ["Web development", "CSS"], domainInterests: [] },
    { username: "demo_e", displayName: "Leo Tanaka", skillsHave: ["Guitar", "Music theory", "Creative writing"], skillsLearn: ["Japanese", "Photography"], domainInterests: [] },
  ];

  const demoUsers = await Promise.all(demoProfiles.map((profile) => User.findOneAndUpdate(
    { username: profile.username },
    {
      $set: {
        ...profile,
        password,
        isProfileComplete: true,
        availableUntil: new Date(Date.now() + 120 * 60_000),
        availableFor: profile.skillsHave,
        lastSeen: new Date(),
        quietHoursStart: "",
        quietHoursEnd: "",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  )));
  if (demoUsers.some((user) => !user)) throw new Error("Could not create the demo members.");

  const users = demoUsers.filter((user): user is NonNullable<typeof user> => user !== null);
  const byUsername = new Map(users.map((user) => [user.username, user]));
  const mira = byUsername.get("demo_a");
  const aarav = byUsername.get("demo_b");
  const sam = byUsername.get("demo_c");
  const nia = byUsername.get("demo_d");
  const leo = byUsername.get("demo_e");
  if (!mira || !aarav || !sam || !nia || !leo) throw new Error("The demo members were not created.");

  const demoIds = users.map((user) => user._id);
  const oldExchanges = await Exchange.find({ members: { $in: demoIds } }).select("_id").lean();
  const exchangeIds = oldExchanges.map((item) => item._id);
  const oldSessions = await Session.find({ $or: [{ participants: { $in: demoIds } }, { exchangeId: { $in: exchangeIds } }] }).select("_id roomId").lean();
  const roomIds = oldSessions.map((item) => item.roomId);
  await Promise.all([
    Message.deleteMany({ sessionRoomId: { $in: roomIds } }),
    SessionRoom.deleteMany({ _id: { $in: roomIds } }),
    SessionReview.deleteMany({ sessionId: { $in: oldSessions.map((item) => item._id) } }),
    SkillBadge.deleteMany({ userId: { $in: demoIds } }),
    Session.deleteMany({ _id: { $in: oldSessions.map((item) => item._id) } }),
    Exchange.deleteMany({ _id: { $in: exchangeIds } }),
    ExchangeInvite.deleteMany({ $or: [{ sender: { $in: demoIds } }, { recipient: { $in: demoIds } }] }),
    Ask.deleteMany({ authorId: { $in: demoIds } }),
    CreditLedger.deleteMany({ userId: { $in: demoIds } }),
    CreditAccount.deleteMany({ userId: { $in: demoIds } }),
    Notification.deleteMany({ recipient: { $in: demoIds } }),
  ]);

  const now = Date.now();
  const exchange = await Exchange.create({
    members: [mira._id, aarav._id],
    weeklyGoal: "Practice accessible React patterns and give each other actionable feedback.",
    status: "active",
    createdBy: mira._id,
    inviteId: null,
    originAskId: null,
  });

  const completedRoomId = new mongoose.Types.ObjectId();
  const completedSessionId = new mongoose.Types.ObjectId();
  const completedStartsAt = new Date(now - 3 * 86_400_000);
  await SessionRoom.create({
    _id: completedRoomId,
    sessionId: completedSessionId,
    exchangeId: exchange._id,
    members: [mira._id, aarav._id],
    notes: "Mira shared her Figma component workflow. Aarav reviewed keyboard behavior and focus states. Next time: practice React Testing Library.",
    notesRevision: 1,
    lastEditedBy: mira._id,
  });
  await Session.create({
    _id: completedSessionId,
    exchangeId: exchange._id,
    participants: [mira._id, aarav._id],
    teacherId: mira._id,
    learnerId: aarav._id,
    topic: "Planning a simple sourdough baking routine",
    startsAt: completedStartsAt,
    durationMinutes: 15,
    status: "completed",
    roomId: completedRoomId,
    idempotencyKey: "demo-completed-session",
    completedAt: new Date(completedStartsAt.getTime() + 15 * 60_000),
    createdBy: aarav._id,
  });
  const review = await SessionReview.create({
    sessionId: completedSessionId,
    reviewerId: aarav._id,
    recipientId: mira._id,
    rating: 5,
    feedback: "Clear, generous teaching. I can apply the baking steps at home now.",
    skills: ["Baking"],
  });
  await SkillBadge.create([
    { userId: mira._id, sessionId: completedSessionId, reviewId: review._id, skill: "Baking" },
  ]);

  const upcomingRoomId = new mongoose.Types.ObjectId();
  const upcomingSessionId = new mongoose.Types.ObjectId();
  await SessionRoom.create({
    _id: upcomingRoomId,
    sessionId: upcomingSessionId,
    exchangeId: exchange._id,
    members: [mira._id, aarav._id],
    notes: "Bring one component example to review together.",
  });
  await Session.create({
    _id: upcomingSessionId,
    exchangeId: exchange._id,
    participants: [mira._id, aarav._id],
    teacherId: aarav._id,
    learnerId: mira._id,
    topic: "Starting a simple fitness routine",
    startsAt: new Date(now + 2 * 86_400_000),
    durationMinutes: 15,
    status: "scheduled",
    roomId: upcomingRoomId,
    idempotencyKey: "demo-upcoming-session",
    completedAt: null,
    createdBy: mira._id,
  });

  await Ask.create([
    { authorId: sam._id, skillOffered: "Python", skillWanted: "Public speaking", note: "I can help you work through Python fundamentals. I would love practice presenting technical ideas clearly.", status: "open" },
    { authorId: nia._id, skillOffered: "Brand design", skillWanted: "CSS", note: "Happy to share a practical branding workflow in exchange for learning responsive CSS techniques.", status: "open" },
    { authorId: leo._id, skillOffered: "Japanese", skillWanted: "Motion design", note: "I can help with conversational Japanese. I am looking for a patient introduction to motion design.", status: "open" },
  ]);

  await Promise.all(users.map((user) => CreditAccount.create({ userId: user._id, balance: 2 })));
  const ledgerEntries = [
    { userId: mira._id, amount: 2, type: "starter", idempotencyKey: "demo-starter-a" },
    { userId: mira._id, counterpartyId: aarav._id, sessionId: completedSessionId, amount: 15, type: "session_earned", idempotencyKey: `${completedSessionId}:earned` },
    { userId: mira._id, counterpartyId: aarav._id, sessionId: upcomingSessionId, amount: -15, type: "session_spent", idempotencyKey: `${upcomingSessionId}:spent` },
    { userId: aarav._id, amount: 2, type: "starter", idempotencyKey: "demo-starter-b" },
    { userId: aarav._id, counterpartyId: mira._id, sessionId: completedSessionId, amount: -15, type: "session_spent", idempotencyKey: `${completedSessionId}:spent` },
    { userId: aarav._id, counterpartyId: mira._id, sessionId: upcomingSessionId, amount: 15, type: "session_earned", idempotencyKey: `${upcomingSessionId}:earned` },
    ...users.slice(2).map((user, index) => ({ userId: user._id, amount: 2, type: "starter", idempotencyKey: `demo-starter-${index + 3}` })),
  ];
  await CreditLedger.insertMany(ledgerEntries);

  await Message.create([
    { senderId: mira._id, receiverId: aarav._id, sessionRoomId: upcomingRoomId, content: "Looking forward to our React session. I will bring a component example.", timestamp: new Date(now - 60 * 60_000), idempotencyKey: "demo-message-a" },
    { senderId: aarav._id, receiverId: mira._id, sessionRoomId: upcomingRoomId, content: "Perfect — I will prepare a small accessible component to review together.", timestamp: new Date(now - 45 * 60_000), idempotencyKey: "demo-message-b" },
  ]);

  await mongoose.disconnect();
  console.log(`Seeded demo learning partners, available helpers, Sessions, reviews, Asks, and credits. Password: ${DEMO_PASSWORD}`);
}

seed().catch(async (error: unknown) => {
  console.error("Demo Exchange seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
