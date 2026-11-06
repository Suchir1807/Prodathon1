import { NextResponse } from "next/server";

import { findQuestAccess } from "@/lib/quest-access";
import connectDB from "@/lib/mongodb";
import { sharedSpecUpdateSchema } from "@/lib/validation/schemas";
import SharedSpec from "@/models/SharedSpec";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const spec = await SharedSpec.findOne({ quest: access.quest._id })
      .populate("editor", "username displayName")
      .populate("history.editor", "username displayName")
      .lean();
    if (!spec) return NextResponse.json({ error: "Shared spec not found." }, { status: 404 });
    return NextResponse.json({
      content: spec.content,
      revision: spec.revision,
      editor: spec.editor
        ? {
            username: (spec.editor as unknown as { username: string }).username,
            displayName: (spec.editor as unknown as { displayName?: string }).displayName ?? "",
          }
        : null,
      updatedAt: spec.updatedAt.toISOString(),
      history: spec.history.map((version) => ({
        content: version.content,
        revision: version.revision,
        editedAt: version.editedAt.toISOString(),
        editor: version.editor
          ? {
              username: (version.editor as unknown as { username: string }).username,
              displayName: (version.editor as unknown as { displayName?: string }).displayName ?? "",
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Quest spec GET error:", error);
    return NextResponse.json({ error: "Unable to load shared spec." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await findQuestAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  if (access.quest.status === "active" && access.quest.deadline && access.quest.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The 72-hour quest window has expired." }, { status: 409 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = sharedSpecUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid spec." }, { status: 400 });
  }
  try {
    await connectDB();
    const now = new Date();
    const updated = await SharedSpec.findOneAndUpdate(
      { quest: access.quest._id, revision: parsed.data.expectedRevision },
      {
        $set: { content: parsed.data.content, editor: access.current._id },
        $inc: { revision: 1 },
        $push: {
          history: {
            $each: [{ content: parsed.data.content, revision: parsed.data.expectedRevision + 1, editor: access.current._id, editedAt: now }],
            $slice: -10,
          },
        },
      },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated) {
      const latest = await SharedSpec.findOne({ quest: access.quest._id }).select("revision").lean();
      return NextResponse.json({ error: "The shared spec changed in another session.", revision: latest?.revision ?? null }, { status: 409 });
    }
    return NextResponse.json({ content: updated.content, revision: updated.revision, updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    console.error("Quest spec PUT error:", error);
    return NextResponse.json({ error: "Unable to save shared spec." }, { status: 500 });
  }
}
