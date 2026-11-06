import type { Metadata } from "next";

import { RealQuestWorkspace } from "@/components/real-quest-workspace";

export const metadata: Metadata = {
  title: "Quest Workspace",
  description: "Build, collaborate, and showcase a real project with your Skillin partner.",
};

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ questId?: string | string[] }>;
}) {
  const params = await searchParams;
  const value = params.questId;
  const initialQuestId = typeof value === "string" ? value : undefined;
  return <RealQuestWorkspace initialQuestId={initialQuestId} />;
}
