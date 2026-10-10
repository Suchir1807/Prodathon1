"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/client-logout";

export function ProfileLogoutButton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 md:px-6">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full border-red-500/40 bg-slate-950/50 text-red-400 hover:border-red-400/60 hover:bg-red-950/30 hover:text-red-300 sm:w-auto sm:min-w-[200px]"
        onClick={() => void logoutUser()}
      >
        <LogOut />
        Log Out
      </Button>
    </div>
  );
}
