import { signOut } from "next-auth/react";

import { clearLocalAppState } from "@/lib/storage";

export async function logoutUser() {
  clearLocalAppState();
  await signOut({ callbackUrl: "/login" });
}
