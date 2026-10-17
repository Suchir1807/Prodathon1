import mongoose from "mongoose";

import { requireCurrentUser } from "@/lib/session-user";
import Workspace from "@/models/Workspace";

export async function findAuthorizedWorkspace(id: string) {
  const current = await requireCurrentUser();
  if (!current) return { error: "Unauthorized", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid workspace.", status: 400 as const };
  }

  const workspace = await Workspace.findOne({
    _id: id,
    users: current._id,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });
  if (!workspace) return { error: "Workspace not found.", status: 404 as const };
  return { current, workspace };
}