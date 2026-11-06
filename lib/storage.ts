import { PLACEHOLDER_CHAT_IDS } from "@/lib/chats";
import { sanitizeProfile } from "@/lib/profile";
import type { Conversation, Profile } from "@/lib/types";

const PROFILE_KEY = "skillin.profile";
const CHATS_KEY = "skillin.chats";
const PROFILE_EVENT = "skillin-profile";
const CHATS_EVENT = "skillin-chats";

const LEGACY_PROFILE_KEY = "cofoundry.profile";
const LEGACY_CHATS_KEY = "cofoundry.chats";

function readMigratedItem(key: string, legacyKey: string) {
  const value = window.localStorage.getItem(key);
  if (value !== null) {
    window.localStorage.removeItem(legacyKey);
    return value;
  }

  const legacyValue = window.localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    window.localStorage.setItem(key, legacyValue);
    window.localStorage.removeItem(legacyKey);
  }
  return legacyValue;
}

function emit(name: string) {
  window.dispatchEvent(new Event(name));
}

export function writeProfile(profile: Profile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  emit(PROFILE_EVENT);
}

export function clearLocalAppState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(CHATS_KEY);
  window.localStorage.removeItem(LEGACY_PROFILE_KEY);
  window.localStorage.removeItem(LEGACY_CHATS_KEY);
  emit(PROFILE_EVENT);
  emit(CHATS_EVENT);
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const chat = value as Conversation;
  return (
    typeof chat.id === "string" &&
    (chat.kind === "dm" || chat.kind === "session") &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages)
  );
}

export function parseChats(value: unknown): Conversation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isConversation);
}

export function mergeChats(stored: Conversation[]) {
  return stored.filter((chat) => !PLACEHOLDER_CHAT_IDS.has(chat.id));
}

export function readChats() {
  if (typeof window === "undefined") return mergeChats([]);
  try {
    const raw = readMigratedItem(CHATS_KEY, LEGACY_CHATS_KEY);
    if (!raw) return mergeChats([]);
    return mergeChats(parseChats(JSON.parse(raw)));
  } catch {
    return mergeChats([]);
  }
}

export function writeChats(chats: Conversation[]) {
  window.localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  emit(CHATS_EVENT);
}

function subscribe(eventName: string) {
  return (onStoreChange: () => void) => {
    const notify = () => onStoreChange();
    window.addEventListener("storage", notify);
    window.addEventListener(eventName, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(eventName, notify);
    };
  };
}

export const subscribeProfile = subscribe(PROFILE_EVENT);
export const subscribeChats = subscribe(CHATS_EVENT);

export function getProfileSnapshot() {
  return readMigratedItem(PROFILE_KEY, LEGACY_PROFILE_KEY) ?? "";
}

export function getChatsSnapshot() {
  return readMigratedItem(CHATS_KEY, LEGACY_CHATS_KEY) ?? "";
}

export function getServerSnapshot() {
  return "";
}

export function profileFromSnapshot(snapshot: string): Profile {
  if (!snapshot) return sanitizeProfile(null);
  try {
    return sanitizeProfile(JSON.parse(snapshot));
  } catch {
    return sanitizeProfile(null);
  }
}

export function chatsFromSnapshot(snapshot: string): Conversation[] {
  if (!snapshot) return mergeChats([]);
  try {
    return mergeChats(parseChats(JSON.parse(snapshot)));
  } catch {
    return mergeChats([]);
  }
}
