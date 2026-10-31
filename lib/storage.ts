import { PLACEHOLDER_CHAT_IDS } from "@/lib/chats";
import { sanitizeProfile } from "@/lib/profile";
import type { AcceptedQuest, Conversation, Profile, Quest } from "@/lib/types";

const PROFILE_KEY = "skillin.profile";
const QUESTS_KEY = "skillin.quests";
const CHATS_KEY = "skillin.chats";
const PROFILE_EVENT = "skillin-profile";
const QUESTS_EVENT = "skillin-quests";
const CHATS_EVENT = "skillin-chats";

const LEGACY_PROFILE_KEY = "cofoundry.profile";
const LEGACY_QUESTS_KEY = "cofoundry.quests";
const LEGACY_CHATS_KEY = "cofoundry.chats";
const LEGACY_WORKSPACE_KEY = "cofoundry.workspace";

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
  window.localStorage.removeItem(QUESTS_KEY);
  window.localStorage.removeItem(CHATS_KEY);
  window.localStorage.removeItem(LEGACY_PROFILE_KEY);
  window.localStorage.removeItem(LEGACY_QUESTS_KEY);
  window.localStorage.removeItem(LEGACY_CHATS_KEY);
  window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
  emit(PROFILE_EVENT);
  emit(QUESTS_EVENT);
  emit(CHATS_EVENT);
  window.dispatchEvent(new Event("skillin-workspace"));
}

function isQuest(value: unknown): value is Quest {
  if (!value || typeof value !== "object") return false;
  const quest = value as Quest;
  return typeof quest.title === "string" && Array.isArray(quest.studentA?.tasks);
}

export function readQuests(): AcceptedQuest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readMigratedItem(QUESTS_KEY, LEGACY_QUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AcceptedQuest => {
      if (!item || typeof item !== "object") return false;
      const quest = item as AcceptedQuest;
      return typeof quest.id === "string" && isQuest(quest.quest);
    });
  } catch {
    return [];
  }
}

export function writeQuests(quests: AcceptedQuest[]) {
  window.localStorage.setItem(QUESTS_KEY, JSON.stringify(quests));
  emit(QUESTS_EVENT);
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const chat = value as Conversation;
  return (
    typeof chat.id === "string" &&
    (chat.kind === "dm" || chat.kind === "quest") &&
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
export const subscribeQuests = subscribe(QUESTS_EVENT);
export const subscribeChats = subscribe(CHATS_EVENT);

export function getProfileSnapshot() {
  return readMigratedItem(PROFILE_KEY, LEGACY_PROFILE_KEY) ?? "";
}

export function getQuestsSnapshot() {
  return readMigratedItem(QUESTS_KEY, LEGACY_QUESTS_KEY) ?? "";
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

export function questsFromSnapshot(snapshot: string): AcceptedQuest[] {
  if (!snapshot) return [];
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AcceptedQuest => {
      if (!item || typeof item !== "object") return false;
      const quest = item as AcceptedQuest;
      return typeof quest.id === "string" && isQuest(quest.quest);
    });
  } catch {
    return [];
  }
}
