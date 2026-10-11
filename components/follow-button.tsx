"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggleFollow() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = (await response.json()) as { following?: boolean; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update follow status.");
        return;
      }
      setFollowing(Boolean(data.following));
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        onClick={() => void toggleFollow()}
        disabled={pending}
        className={following
          ? "border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
          : "border-blue-400 bg-blue-600 text-white hover:bg-blue-500"}
      >
        <UserRoundPlus />
        {pending ? "Updating…" : following ? "Unfollow" : "Follow"}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}