import mongoose from "mongoose";

import { requireCurrentUser } from "@/lib/session-user";
import Exchange from "@/models/Exchange";

export async function findAuthorizedExchange(id: string) {
  const current = await requireCurrentUser();
  if (!current) return { error: "Unauthorized", status: 401 as const };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid Exchange.", status: 400 as const };
  }

  const exchange = await Exchange.findOne({ _id: id, members: current._id }).lean();
  if (!exchange) return { error: "Exchange not found.", status: 404 as const };
  return { current, exchange };
}
