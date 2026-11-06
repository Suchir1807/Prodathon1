import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Build together",
  description:
    "Find a complementary collaborator, take on a focused 3-day quest, and ship something worth sharing.",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
