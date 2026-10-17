import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/session-user";
import Workspace from "@/models/Workspace";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: RouteContext) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  }

  const workspaceQuery = { _id: id, users: current._id, type: "sprint" as const };
  const workspace = await Workspace.findOne(workspaceQuery)
    .select("_id status expiresAt")
    .lean();
  if (!workspace) {
    return NextResponse.json({ error: "Sprint workspace not found." }, { status: 404 });
  }
  if (workspace.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }
  if (workspace.status !== "active") {
    return NextResponse.json({ error: "This sprint is not active." }, { status: 409 });
  }
  if (!workspace.expiresAt || workspace.expiresAt > new Date()) {
    return NextResponse.json({ error: "The sprint timer has not ended." }, { status: 409 });
  }

  const completedWorkspace = await Workspace.findOneAndUpdate(
    { ...workspaceQuery, status: "active", expiresAt: { $lte: new Date() } },
    { $set: { status: "completed" } },
    { new: true },
  )
    .select("_id status")
    .lean();
  if (completedWorkspace) {
    return NextResponse.json({ status: "completed" });
  }

  const latestWorkspace = await Workspace.findOne(workspaceQuery)
    .select("_id status")
    .lean();
  if (latestWorkspace?.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }

  return NextResponse.json({ error: "Sprint completion could not be saved." }, { status: 409 });
}
