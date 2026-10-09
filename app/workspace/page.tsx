import type { Metadata } from "next";

import { QuestWorkspace } from "@/components/quest-workspace";

export const metadata: Metadata = {
  title: "Quest Workspace",
};

export default function WorkspacePage() {
  return <QuestWorkspace />;
}
