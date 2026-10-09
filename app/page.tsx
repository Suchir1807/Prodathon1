import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function HomePage() {
  return <DashboardView />;
}
