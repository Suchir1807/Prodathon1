import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export default async function LegacyPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();
  await connectDB();
  const user = await User.findById(id).select("username").lean();
  if (!user) notFound();
  redirect(`/u/${encodeURIComponent(user.username)}`);
}