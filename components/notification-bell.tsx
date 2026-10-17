"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";

type FollowNotification = {
  id: string;
  type: "follow";
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    isFollowing: boolean;
  };
};

type NotificationsResponse = {
  notifications?: FollowNotification[];
  unreadCount?: number;
  error?: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<FollowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [followingBack, setFollowingBack] = useState<string[]>([]);
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await response.json()) as NotificationsResponse;
      if (!response.ok) throw new Error(data.error ?? "Unable to load notifications.");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Start the initial request here; loadNotifications manages its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open || unreadCount === 0) return;
    let cancelled = false;

    async function markAsRead() {
      try {
        const response = await fetch("/api/notifications", { method: "PATCH" });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to mark notifications as read.");
        if (!cancelled) {
          setUnreadCount(0);
          setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
        }
      } catch (markError) {
        if (!cancelled) {
          setError(markError instanceof Error ? markError.message : "Unable to mark notifications as read.");
        }
      }
    }

    void markAsRead();
    return () => {
      cancelled = true;
    };
  }, [open, unreadCount]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  async function followBack(userId: string) {
    if (pendingFollow) return;
    setPendingFollow(userId);
    setFollowingBack((current) => [...current, userId]);
    setError("");
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const data = (await response.json()) as { following?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to follow back.");
      if (!data.following) throw new Error("Follow-back was not confirmed.");
      setNotifications((current) =>
        current.map((item) =>
          item.sender.id === userId
            ? { ...item, sender: { ...item.sender, isFollowing: true } }
            : item,
        ),
      );
    } catch (followError) {
      setFollowingBack((current) => current.filter((id) => id !== userId));
      setError(followError instanceof Error ? followError.message : "Unable to follow back.");
    } finally {
      setPendingFollow(null);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/5 hover:text-[#ccff00]"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            aria-label="Notifications"
            className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#0e1526]/95 p-3 shadow-xl backdrop-blur-xl"
          >
            <header className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium tracking-wide text-slate-300 uppercase">Notifications</h2>
              {unreadCount > 0 ? (
                <span className="text-[10px] text-red-300">{unreadCount} unread</span>
              ) : null}
            </header>
            {error ? <p role="alert" className="mt-2 px-1 text-xs text-rose-400">{error}</p> : null}
            {loading && notifications.length === 0 ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-1 py-6 text-sm text-slate-500">You&apos;re all caught up.</p>
            ) : (
              <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                {notifications.map((notification) => {
                  const sender = notification.sender;
                  const name = sender.displayName.trim() || sender.username;
                  const followsBack =
                    sender.isFollowing || followingBack.includes(sender.id);
                  return (
                    <li
                      key={notification.id}
                      className={`flex items-center gap-2 rounded-lg p-2 ${
                        notification.isRead ? "bg-transparent" : "bg-white/[0.045]"
                      }`}
                    >
                      <UserAvatar name={name} className="size-9 text-[10px]" />
                      <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-300">
                        <span className="font-medium text-white">{name}</span> started following you.
                      </p>
                      {followsBack ? (
                        <Link
                          href={`/profile/${encodeURIComponent(sender.id)}`}
                          onClick={() => setOpen(false)}
                          className="shrink-0 text-[10px] text-[#ccff00] hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void followBack(sender.id)}
                          disabled={pendingFollow !== null}
                          className="shrink-0 rounded-md border border-[#ccff00]/30 bg-[#ccff00]/10 px-2 py-1 text-[10px] font-medium text-[#ccff00] transition hover:bg-[#ccff00]/20 disabled:opacity-50"
                        >
                          {pendingFollow === sender.id ? "Following…" : "Follow Back"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
