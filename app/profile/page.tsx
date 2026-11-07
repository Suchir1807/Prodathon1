import type { Metadata } from "next";

import { ProfilePage } from "@/components/profile-page";

export const metadata: Metadata = { title: "Profile" };

export default function ProfileRoute() {
  return <ProfilePage />;
}
