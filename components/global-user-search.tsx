"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { formatUsername } from "@/lib/profile";

type SearchUser = {
  id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
};

export function GlobalUserSearch() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { users?: SearchUser[] };
        if (!cancelled) setUsers(response.ok ? data.users ?? [] : []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const showResults = focused && query.trim().length >= 2;

  return (
    <div className="relative w-28 min-w-0 max-w-xs flex-1 sm:w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-slate-500" />
      <Input
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setUsers([]);
            setLoading(false);
          } else {
            setLoading(true);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Search founders"
        aria-label="Search founders or skills"
        aria-expanded={showResults}
        className="h-9 border-white/10 bg-white/[0.03] pl-9 text-sm"
      />
      {showResults ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#10182b] shadow-2xl">
          {loading ? (
            <p className="px-3 py-3 text-xs text-slate-400">Searching…</p>
          ) : users.length ? (
            <ul role="listbox" aria-label="Founders">
              {users.map((user) => {
                const name = user.displayName.trim() || formatUsername(user.username);
                return (
                  <li key={user.id}>
                    <Link
                      href={`/profile/${user.id}`}
                      onClick={() => {
                        setQuery("");
                        setFocused(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5"
                    >
                      <UserAvatar name={name} className="size-8 text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          @{user.username}
                          {user.skillsHave.length ? ` · ${user.skillsHave.slice(0, 2).join(", ")}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
              <UserRound className="size-4" /> No founders found
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}