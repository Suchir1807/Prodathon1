import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { questHintSchema } from "@/lib/validation/schemas";
import Quest from "@/models/Quest";
import SharedSpec from "@/models/SharedSpec";
import Task from "@/models/Task";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.quest.status !== "active") {
    return NextResponse.json({ error: "Hints are available while a quest is active." }, { status: 409 });
  }
  if (access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = questHintSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Describe the blocker." }, { status: 400 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI hints are not configured right now." }, { status: 503 });

  try {
    await connectDB();
    const [tasks, spec] = await Promise.all([
      Task.find({ quest: access.quest._id }).select("title role status").sort({ order: 1 }).lean(),
      SharedSpec.findOne({ quest: access.quest._id }).select("content").lean(),
    ]);
    const key = `hintCounts.${access.current._id.toString()}`;
    const reserved = await Quest.findOneAndUpdate(
      { _id: access.quest._id, status: "active", $or: [{ [key]: { $lt: 10 } }, { [key]: { $exists: false } }] },
      { $inc: { [key]: 1 } },
      { returnDocument: "after" },
    ).select(key);
    if (!reserved) return NextResponse.json({ error: "You have used all 10 hints for this quest." }, { status: 429 });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are a practical pair-programming mentor. Give one short, specific next step (under 100 words), not a full solution.
Quest: ${access.quest.title}
Brief: ${access.quest.brief}
Tasks: ${JSON.stringify(tasks)}
Shared spec: ${(spec?.content ?? "").slice(0, 6000)}
Blocker: ${parsed.data.blocker}`,
    });
    const hint = response.text?.trim();
    if (!hint) return NextResponse.json({ error: "The AI did not return a hint. Try again." }, { status: 502 });
    return NextResponse.json({ hint, remaining: 10 - ((reserved.hintCounts.get(access.current._id.toString()) ?? 1)) });
  } catch (error) {
    console.error("Quest hint error:", error);
    return NextResponse.json({ error: "Unable to generate a hint right now." }, { status: 502 });
  }
}
