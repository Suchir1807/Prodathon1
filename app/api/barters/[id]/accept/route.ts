import mongoose from "mongoose";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Barter from "@/models/Barter";
import Workspace from "@/models/Workspace";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid trade." }, { status: 400 });
  }

  const connection = await connectDB();
  const transaction = await connection.startSession();
  let workspaceId = "";
  let failure: "missing" | "closed" | "self" | null = null;

  try {
    await transaction.withTransaction(async () => {
      const barter = await Barter.findOneAndUpdate(
        { _id: id, status: "open", authorId: { $ne: current._id } },
        { $set: { status: "in-progress", partnerId: current._id } },
        { new: true, session: transaction },
      );

      if (!barter) {
        const existing = await Barter.findById(id).session(transaction);
        failure = !existing ? "missing" : existing.authorId.equals(current._id) ? "self" : "closed";
        return;
      }

      const [workspace] = await Workspace.create(
        [{
          users: [barter.authorId, current._id],
          type: "barter",
          referenceId: barter._id,
          referenceModel: "Barter",
          scratchpad: "",
          tasks: [],
        }],
        { session: transaction },
      );
      workspaceId = workspace._id.toString();
    });
  } catch (error) {
    console.error("Barter acceptance PUT error:", error);
    return NextResponse.json({ error: "Unable to accept trade." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }

  if (failure === "missing") return NextResponse.json({ error: "Trade not found." }, { status: 404 });
  if (failure === "self") return NextResponse.json({ error: "You cannot accept your own trade." }, { status: 400 });
  if (failure || !workspaceId) {
    return NextResponse.json({ error: "This trade is no longer open." }, { status: 409 });
  }

  return NextResponse.json({ workspaceId });
}