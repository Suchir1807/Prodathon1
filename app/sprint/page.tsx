import type { Metadata } from "next";

import { SprintMatchmaking } from "@/components/sprint-matchmaking";

export const metadata: Metadata = { title: "12-Hour Flash Build" };

export default function SprintPage() {
  return <SprintMatchmaking />;
}