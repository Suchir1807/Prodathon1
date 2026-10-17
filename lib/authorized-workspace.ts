import mongoose, { type HydratedDocument, type Types } from "mongoose";

import { requireCurrentUser } from "@/lib/session-user";
import Workspace, { type IWorkspace, type IWorkspaceTask } from "@/models/Workspace";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof requireCurrentUser>>>;
type WorkspaceLean = Pick<IWorkspace, "users" | "type" | "scratchpad" | "tasks" | "expiresAt"> & {
  _id: Types.ObjectId;
  tasks: IWorkspaceTask[];
};
type WorkspaceAccessError = { error: string; status: 400 | 401 | 404 };
type WorkspaceDocumentAccess = { current: CurrentUser; workspace: HydratedDocument<IWorkspace> };
type WorkspaceLeanAccess = { current: CurrentUser; workspace: WorkspaceLean };

export function findAuthorizedWorkspace(id: string): Promise<WorkspaceDocumentAccess | WorkspaceAccessError>;
export function findAuthorizedWorkspace(
  id: string,
  lean: true,
): Promise<WorkspaceLeanAccess | WorkspaceAccessError>;
export async function findAuthorizedWorkspace(
  id: string,
  lean = false,
): Promise<WorkspaceDocumentAccess | WorkspaceLeanAccess | WorkspaceAccessError> {
  const current = await requireCurrentUser();
  if (!current) return { error: "Unauthorized", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid workspace.", status: 400 as const };
  }

  const query = Workspace.findOne({
    _id: id,
    users: current._id,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  if (lean) {
    const workspace = await query
      .select("_id users type scratchpad tasks expiresAt")
      .lean<WorkspaceLean | null>();
    if (!workspace) return { error: "Workspace not found.", status: 404 as const };
    return { current, workspace };
  }

  const workspace = await query;
  if (!workspace) return { error: "Workspace not found.", status: 404 as const };
  return { current, workspace };
}