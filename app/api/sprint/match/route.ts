import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { requireCurrentUser } from "@/lib/session-user";
import Sprint from "@/models/Sprint";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

const SPRINT_DURATION_MS = 12 * 60 * 60 * 1000;

export async function POST() {
  const current = await requireCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await connectDB();
  const transaction = await connection.startSession();
  let result:
    | { matched: true; workspaceId: string; expiresAt: string }
    | { matched: false; status: "searching" }
    | undefined;

  try {
    await transaction.withTransaction(async () => {
      const currentUser = await User.findById(current._id).session(transaction);
      if (!currentUser) throw new Error("CURRENT_USER_NOT_FOUND");

      const existingWorkspace = await Workspace.findOne({
        users: currentUser._id,
        type: "sprint",
        expiresAt: { $gt: new Date() },
      }).session(transaction);
      if (existingWorkspace) {
        result = {
          matched: true,
          workspaceId: existingWorkspace._id.toString(),
          expiresAt: existingWorkspace.expiresAt!.toISOString(),
        };
        return;
      }

      if (currentUser.sprintStatus === "active") {
        currentUser.sprintStatus = "searching";
        await currentUser.save({ session: transaction });
      }

      const partner = await User.findOne({
        _id: { $ne: currentUser._id },
        sprintStatus: "searching",
      })
        .sort({ createdAt: 1, _id: 1 })
        .session(transaction);

      if (!partner) {
        await User.updateOne(
          { _id: currentUser._id },
          { $set: { sprintStatus: "searching" } },
          { session: transaction },
        );
        result = { matched: false, status: "searching" };
        return;
      }

      const claimedCurrent = await User.findOneAndUpdate(
        { _id: currentUser._id, sprintStatus: { $in: ["idle", "searching"] } },
        { $set: { sprintStatus: "active" } },
        { new: true, session: transaction },
      );
      if (!claimedCurrent) {
        result = { matched: false, status: "searching" };
        return;
      }

      const claimedPartner = await User.findOneAndUpdate(
        { _id: partner._id, sprintStatus: "searching" },
        { $set: { sprintStatus: "active" } },
        { new: true, session: transaction },
      );
      if (!claimedPartner) {
        await User.updateOne(
          { _id: currentUser._id },
          { $set: { sprintStatus: "searching" } },
          { session: transaction },
        );
        result = { matched: false, status: "searching" };
        return;
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + SPRINT_DURATION_MS);
      const [sprint] = await Sprint.create(
        [{ users: [claimedCurrent._id, claimedPartner._id], startedAt, expiresAt }],
        { session: transaction },
      );
      const [workspace] = await Workspace.create(
        [{
          users: [claimedCurrent._id, claimedPartner._id],
          type: "sprint",
          referenceId: sprint._id,
          referenceModel: "Sprint",
          scratchpad: "",
          tasks: [],
          expiresAt,
        }],
        { session: transaction },
      );

      result = {
        matched: true,
        workspaceId: workspace._id.toString(),
        expiresAt: expiresAt.toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Sprint match POST error:", error);
    return NextResponse.json({ error: "Unable to enter matchmaking." }, { status: 500 });
  } finally {
    await transaction.endSession();
  }

  return NextResponse.json(result ?? { matched: false, status: "searching" });
}