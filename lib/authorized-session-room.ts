import mongoose from "mongoose";

import { requireCurrentUser } from "@/lib/session-user";
import SessionRoom from "@/models/SessionRoom";

export async function findAuthorizedSessionRoom(id: string) {
  const current = await requireCurrentUser();
  if (!current) return { error: "Unauthorized", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid SessionRoom.", status: 400 as const };
  }

  const room = await SessionRoom.findOne({ _id: id, members: current._id }).lean();
  if (!room) return { error: "SessionRoom not found.", status: 404 as const };
  return { current, room };
}
