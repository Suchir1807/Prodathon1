import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Learn through skill exchange",
  description: "A peer-to-peer skill exchange where you teach what you know, earn time credits, and learn anything from anyone.",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
