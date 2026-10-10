import { EMPTY_PROFILE } from "@/lib/catalog";
import type { Profile } from "@/lib/types";

function cleanList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, max);
}

export function sanitizeProfile(value: unknown): Profile {
  if (!value || typeof value !== "object") return { ...EMPTY_PROFILE };
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim().slice(0, 60) : "";
  return {
    name,
    canTeach: cleanList(data.canTeach),
    wantsToLearn: cleanList(data.wantsToLearn),
    domains: cleanList(data.domains),
  };
}

export function formatUsername(username: string) {
  const value = username.trim();
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function displayName(profile: Profile, usernameFallback?: string) {
  const custom = profile.name.trim();
  if (custom) return custom;
  const fromUsername = usernameFallback ? formatUsername(usernameFallback) : "";
  return fromUsername || "You";
}

export function profileReady(profile: Profile) {
  return (
    profile.canTeach.length > 0 &&
    profile.wantsToLearn.length > 0 &&
    profile.domains.length > 0
  );
}
