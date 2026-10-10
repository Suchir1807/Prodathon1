import { SEED_CHATS } from "@/lib/chats";
import { sanitizeProfile } from "@/lib/profile";
import type { AcceptedQuest, Conversation, Profile, Quest } from "@/lib/types";

const PROFILE_KEY = "cofoundry.profile";
const QUESTS_KEY = "cofoundry.quests";
const CHATS_KEY = "cofoundry.chats";
const PROFILE_EVENT = "cofoundry-profile";
const QUESTS_EVENT = "cofoundry-quests";
const CHATS_EVENT = "cofoundry-chats";

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
  window.localStorage.removeItem("cofoundry.workspace");
  emit(PROFILE_EVENT);
  emit(QUESTS_EVENT);
  emit(CHATS_EVENT);
  window.dispatchEvent(new Event("cofoundry-workspace"));
}

function isQuest(value: unknown): value is Quest {
  if (!value || typeof value !== "object") return false;
  const quest = value as Quest;
  return typeof quest.title === "string" && Array.isArray(quest.studentA?.tasks);
}

export function readQuests(): AcceptedQuest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUESTS_KEY);
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
  const ids = new Set(stored.map((chat) => chat.id));
  return [...stored, ...SEED_CHATS.filter((chat) => !ids.has(chat.id))];
}

export function readChats() {
  if (typeof window === "undefined") return mergeChats([]);
  try {
    const raw = window.localStorage.getItem(CHATS_KEY);
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
  return window.localStorage.getItem(PROFILE_KEY) ?? "";
}

export function getQuestsSnapshot() {
  return window.localStorage.getItem(QUESTS_KEY) ?? "";
}

export function getChatsSnapshot() {
  return window.localStorage.getItem(CHATS_KEY) ?? "";
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
