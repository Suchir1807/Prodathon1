import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";

import Badge from "../models/Badge";
import Message from "../models/Message";
import Notification from "../models/Notification";
import PartnerRequest from "../models/PartnerRequest";
import Quest from "../models/Quest";
import Review from "../models/Review";
import SharedSpec from "../models/SharedSpec";
import Showcase from "../models/Showcase";
import Submission from "../models/Submission";
import Task from "../models/Task";
import User from "../models/User";

loadEnvConfig(process.cwd());

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "SkillinDemo!2026";

async function seed() {
  if (!process.argv.includes("--confirm-demo-seed")) {
    throw new Error("Run with --confirm-demo-seed to create or refresh the demo users and quests.");
  }
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI environment variable.");

  await mongoose.connect(process.env.MONGODB_URI);
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  await Promise.all([
    User.updateOne({ username: "demo-a" }, { $set: { username: "demo_a" } }),
    User.updateOne({ username: "demo-b" }, { $set: { username: "demo_b" } }),
  ]);
  const [userA, userB] = await Promise.all([
    User.findOneAndUpdate(
      { username: "demo_a" },
      {
        $set: {
          password,
          displayName: "Mira Chen",
          skillsHave: ["Product design", "React", "TypeScript"],
          skillsLearn: ["API design", "MongoDB"],
          domainInterests: ["Education", "Productivity"],
          isProfileComplete: true,
        },
        $setOnInsert: { followers: [], following: [], sprintStatus: "idle" },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ),
    User.findOneAndUpdate(
      { username: "demo_b" },
      {
        $set: {
          password,
          displayName: "Aarav Patel",
          skillsHave: ["Node.js", "MongoDB", "API design"],
          skillsLearn: ["React", "Product design"],
          domainInterests: ["Education", "Community"],
          isProfileComplete: true,
        },
        $setOnInsert: { followers: [], following: [], sprintStatus: "idle" },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ),
  ]);
  if (!userA || !userB) throw new Error("Could not create demo users.");

  const extraRequests = await PartnerRequest.find({
    $or: [
      { sender: userA._id, recipient: userB._id },
      { sender: userB._id, recipient: userA._id },
    ],
    idempotencyKey: { $nin: ["demo-finished-quest", "demo-active-quest"] },
  }).select("_id").lean();
  const extraRequestIds = extraRequests.map((request) => request._id);
  const extraQuests = await Quest.find({ sourceRequest: { $in: extraRequestIds } }).select("_id").lean();
  const extraQuestIds = extraQuests.map((quest) => quest._id);
  await Promise.all([
    PartnerRequest.deleteMany({ _id: { $in: extraRequestIds } }),
    Quest.deleteMany({ _id: { $in: extraQuestIds } }),
    Task.deleteMany({ quest: { $in: extraQuestIds } }),
    SharedSpec.deleteMany({ quest: { $in: extraQuestIds } }),
    Submission.deleteMany({ quest: { $in: extraQuestIds } }),
    Review.deleteMany({ quest: { $in: extraQuestIds } }),
    Showcase.deleteMany({ quest: { $in: extraQuestIds } }),
    Badge.deleteMany({ quest: { $in: extraQuestIds } }),
    Message.deleteMany({ questId: { $in: extraQuestIds } }),
    Notification.deleteMany({
      $or: [
        { questId: { $in: extraQuestIds } },
        { resourceId: { $in: extraRequestIds } },
      ],
    }),
  ]);

  const startedFinished = new Date(Date.now() - 7 * 86_400_000);
  const startedActive = new Date(Date.now() - 28 * 3_600_000);
  const finishedRequest = await PartnerRequest.findOneAndUpdate(
    { sender: userA._id, recipient: userB._id, idempotencyKey: "demo-finished-quest" },
    { $set: { status: "accepted", respondedAt: startedFinished } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  const activeRequest = await PartnerRequest.findOneAndUpdate(
    { sender: userB._id, recipient: userA._id, idempotencyKey: "demo-active-quest" },
    { $set: { status: "accepted", respondedAt: startedActive } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!finishedRequest || !activeRequest) throw new Error("Could not create demo partner requests.");

  const finishedQuest = await Quest.findOneAndUpdate(
    { sourceRequest: finishedRequest._id },
    {
      $set: {
        members: [
          { user: userA._id, role: "A", acceptedAt: startedFinished },
          { user: userB._id, role: "B", acceptedAt: startedFinished },
        ],
        title: "Campus Skill Exchange",
        brief: "Help students find complementary teammates and turn one shared idea into a focused build quest.",
        status: "completed",
        generationSource: "gemini",
        skillsUsed: ["React", "Product design", "API design", "MongoDB"],
        roles: { A: "Designed and built the student-facing experience.", B: "Built the matching and persistence layer." },
        curveball: {
          text: "Make the match flow useful when a student has only one listed skill.",
          unlockHour: 36,
          unlockedAt: new Date(startedFinished.getTime() + 36 * 3_600_000),
          taskAdded: true,
        },
        stretchGoal: "Add a clear, accessible explanation for why two builders complement each other.",
        startedAt: startedFinished,
        deadline: new Date(startedFinished.getTime() + 72 * 3_600_000),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  const activeQuest = await Quest.findOneAndUpdate(
    { sourceRequest: activeRequest._id },
    {
      $set: {
        members: [
          { user: userB._id, role: "A", acceptedAt: startedActive },
          { user: userA._id, role: "B", acceptedAt: startedActive },
        ],
        title: "Study Sprint Planner",
        brief: "Build a lightweight planner that turns a study goal into realistic, collaborative sessions for a small campus group.",
        status: "active",
        generationSource: "gemini",
        skillsUsed: ["Node.js", "React", "Product design"],
        roles: { A: "Own the data model, API behavior, and session scheduling.", B: "Shape the student workflow and build the planning interface." },
        curveball: {
          text: "Add a last-minute schedule change and preserve the group’s agreed study plan.",
          unlockHour: 36,
          unlockedAt: null,
          taskAdded: false,
        },
        stretchGoal: "Make the session plan usable with keyboard-only navigation.",
        startedAt: startedActive,
        deadline: new Date(startedActive.getTime() + 72 * 3_600_000),
        submissionId: null,
        reviewId: null,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!finishedQuest || !activeQuest) throw new Error("Could not create demo quests.");

  await Promise.all([
    Task.deleteMany({ quest: finishedQuest._id }),
    Task.deleteMany({ quest: activeQuest._id }),
    Badge.deleteMany({ quest: finishedQuest._id }),
    Badge.deleteMany({ quest: activeQuest._id }),
    Message.deleteMany({ questId: activeQuest._id }),
    Notification.deleteMany({ questId: { $in: [finishedQuest._id, activeQuest._id] } }),
    Submission.deleteMany({ quest: activeQuest._id }),
    Review.deleteMany({ quest: activeQuest._id }),
    Showcase.deleteMany({ quest: activeQuest._id }),
  ]);

  const finishedTasks = [
    "Interview two students about how they find project teammates",
    "Design the skill profile and matching states",
    "Create complementary-skill scoring",
    "Build the partner discovery experience",
    "Persist partner requests and acceptance",
    "Test the full matching path with two accounts",
    "Prepare the public project story",
  ];
  await Task.insertMany(finishedTasks.map((title, order) => ({
    quest: finishedQuest._id,
    title,
    role: order === 1 || order === 3 ? "A" : order === 2 || order === 4 ? "B" : "shared",
    assignee: order === 1 || order === 3 ? userA._id : order === 2 || order === 4 ? userB._id : null,
    status: "done",
    order,
    priority: 3,
    createdBy: order % 2 ? userA._id : userB._id,
    completedAt: new Date(startedFinished.getTime() + (order + 2) * 3_600_000),
    completedBy: order % 2 ? userA._id : userB._id,
  })));
  const activeTasks = [
    { title: "Agree on the first-time planner flow", role: "shared", status: "done" },
    { title: "Define session and participant API shapes", role: "A", status: "done" },
    { title: "Build the weekly planning screen", role: "B", status: "doing" },
    { title: "Add session creation and persistence", role: "A", status: "doing" },
    { title: "Handle unavailable time slots", role: "shared", status: "todo" },
    { title: "Test the plan with a realistic study week", role: "shared", status: "todo" },
    { title: "Polish the demo and write the handoff", role: "shared", status: "todo" },
  ] as const;
  await Task.insertMany(activeTasks.map((task, order) => {
    const assignee = task.role === "A" ? userB._id : task.role === "B" ? userA._id : null;
    return {
      quest: activeQuest._id,
      title: task.title,
      role: task.role,
      assignee,
      status: task.status,
      order,
      priority: order < 2 ? 2 : 3,
      createdBy: userB._id,
      completedAt: task.status === "done" ? new Date(startedActive.getTime() + 8 * 3_600_000) : null,
      completedBy: task.status === "done" ? userB._id : null,
    };
  }));

  const finishedSpec = "# Campus Skill Exchange\n\n## User problem\nStudents need a reliable way to find teammates with complementary strengths.\n\n## Shared contract\nProfiles publish skills to teach, skills to learn, and areas of interest.\n\n## Demo acceptance\n- Search by name and skill.\n- Explain why a pair is complementary.\n- Accept a request and open a shared quest.";
  const activeSpec = "# Study Sprint Planner\n\n## Goal\nHelp a small study group make a plan they can keep.\n\n## Data contract\nA session has a topic, start and end time, capacity, and participants.\n\n## Current question\nHow should a schedule change be communicated without losing the original agreement?\n\n## Acceptance\n- A student can create a session.\n- A partner can see the shared plan.\n- The flow remains clear on a narrow screen.";
  await Promise.all([
    SharedSpec.findOneAndUpdate(
      { quest: finishedQuest._id },
      { $set: { content: finishedSpec, revision: 3, editor: userB._id, history: [
        { content: "# Campus Skill Exchange\n\nA small student teammate finder.", revision: 1, editor: userA._id, editedAt: startedFinished },
        { content: "# Campus Skill Exchange\n\nStudents find complementary teammates and agree on a project.", revision: 2, editor: userB._id, editedAt: new Date(startedFinished.getTime() + 4 * 3_600_000) },
        { content: finishedSpec, revision: 3, editor: userB._id, editedAt: new Date(startedFinished.getTime() + 8 * 3_600_000) },
      ] } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ),
    SharedSpec.findOneAndUpdate(
      { quest: activeQuest._id },
      { $set: { content: activeSpec, revision: 2, editor: userA._id, history: [
        { content: "# Study Sprint Planner\n\nBuild a shared study planner.", revision: 1, editor: userB._id, editedAt: startedActive },
        { content: activeSpec, revision: 2, editor: userA._id, editedAt: new Date(startedActive.getTime() + 14 * 3_600_000) },
      ] } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ),
  ]);

  const submission = await Submission.findOneAndUpdate(
    { quest: finishedQuest._id, submittedBy: userA._id, idempotencyKey: "demo-finished-submission" },
    { $set: {
      repositoryUrl: "https://github.com/demo/skillin-campus-exchange",
      demoUrl: "https://example.com/skillin-campus-exchange",
      writeUp: "We built a clear, skill-first partner discovery flow with complementary match signals. Mira led the student experience and React implementation; Aarav shaped the matching behavior and persistence. The primary journey is documented and ready to demo.",
      status: "approved",
    } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!submission) throw new Error("Could not create finished demo submission.");
  const review = await Review.findOneAndUpdate(
    { submission: submission._id, reviewer: userB._id },
    { $set: { quest: finishedQuest._id, rating: 5, feedback: "Clear division of work, thoughtful matching, and a complete end-to-end demo. The shared build made both of us stronger." , decision: "approved" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!review) throw new Error("Could not create demo review.");
  await Quest.updateOne({ _id: finishedQuest._id }, { $set: { submissionId: submission._id, reviewId: review._id } });
  await Showcase.findOneAndUpdate(
    { quest: finishedQuest._id },
    { $set: { submission: submission._id, publicId: "skillin-demo-finished", visibility: "public" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  await Badge.insertMany(["React", "Product design", "API design", "MongoDB"].flatMap((skill) =>
    [userA, userB].map((user) => ({
      user: user._id,
      quest: finishedQuest._id,
      skill,
      submission: submission._id,
      review: review._id,
      verifiedAt: new Date(startedFinished.getTime() + 72 * 3_600_000),
    })),
  ));
  await Quest.updateOne({ _id: activeQuest._id }, { $set: { "curveball.taskAdded": false, "curveball.unlockedAt": null } });

  await Message.insertMany([
    { questId: activeQuest._id, senderId: userB._id, receiverId: userA._id, content: "I’ve got the session endpoints working. The date format is ISO 8601 in UTC.", timestamp: new Date(startedActive.getTime() + 16 * 3_600_000), idempotencyKey: "demo-active-message-1" },
    { questId: activeQuest._id, senderId: userA._id, receiverId: userB._id, content: "Great. I’ll show the timezone clearly and add a conflict state before we integrate.", timestamp: new Date(startedActive.getTime() + 17 * 3_600_000), idempotencyKey: "demo-active-message-2" },
    { questId: activeQuest._id, senderId: userB._id, receiverId: userA._id, content: "I’ve added a sample group with three students so we can test capacity and edge cases.", timestamp: new Date(startedActive.getTime() + 19 * 3_600_000), idempotencyKey: "demo-active-message-3" },
  ]);

  await mongoose.disconnect();
  console.log("Seeded demo_a and demo_b with one active quest and one completed showcase.");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

seed().catch(async (error: unknown) => {
  console.error("Demo quest seed failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
