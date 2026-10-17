import type { Metadata } from "next";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

import { ProductivityWorkspace } from "@/components/productivity-workspace";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

export const metadata: Metadata = { title: "Productivity Workspace" };

export default async function ProductivityWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connectDB();
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sessionUserId = session.user.id.toString();
  console.log("[workspace] Session user ID:", sessionUserId);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return <div>Error: Invalid workspace ID {id}</div>;
  }

  const workspace = await Workspace.findById(id)
    .select("_id users type status scratchpad tasks expiresAt")
    .lean();
  console.log(
    "[workspace] Fetched workspace:",
    workspace
      ? {
          id: workspace._id.toString(),
          users: workspace.users.map((userId) => userId.toString()),
          type: workspace.type,
        }
      : null,
  );

  if (!workspace) {
    return <div>Error: Workspace not found for ID {id}</div>;
  }

  if (workspace.expiresAt && workspace.expiresAt <= new Date()) {
    return <div>Error: Workspace {id} has expired</div>;
  }

  const workspaceUserIds = workspace.users.map((userId) => userId.toString());
  if (!workspaceUserIds.includes(sessionUserId)) {
    return <div>Error: User {sessionUserId} is not authorized for workspace {id}</div>;
  }

  const partnerId = workspace.users.find((userId) => userId.toString() !== sessionUserId);
  const partner = partnerId
    ? await User.findById(partnerId).select("_id username displayName").lean()
    : null;
  if (!partner) {
    return <div>Error: Workspace partner could not be found for ID {id}</div>;
  }

  return (
    <ProductivityWorkspace
      currentUserId={sessionUserId}
      partner={{
        id: partner._id.toString(),
        username: partner.username,
        displayName: partner.displayName ?? "",
      }}
      workspace={{
        id: workspace._id.toString(),
        type: workspace.type,
        status: workspace.status ?? "active",
        scratchpad: workspace.scratchpad ?? "",
        tasks: workspace.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
        })),
        expiresAt: workspace.expiresAt?.toISOString() ?? null,
      }}
    />
  );
}