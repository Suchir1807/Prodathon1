"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";

import { buildQuestChat, messageFromYou } from "@/lib/chats";
import { displayName, sanitizeProfile } from "@/lib/profile";
import {
  getChatsSnapshot,
  getProfileSnapshot,
  getQuestsSnapshot,
  getServerSnapshot,
  chatsFromSnapshot,
  profileFromSnapshot,
  questsFromSnapshot,
  readChats,
  readQuests,
  subscribeChats,
  subscribeProfile,
  subscribeQuests,
  writeChats,
  writeProfile,
  writeQuests,
} from "@/lib/storage";
import type { AcceptedQuest, Conversation, Profile } from "@/lib/types";

type ProfileContextValue = {
  profile: Profile;
  quests: AcceptedQuest[];
  chats: Conversation[];
  saveProfile: (profile: Profile) => void;
  acceptQuest: (quest: AcceptedQuest) => string;
  sendMessage: (chatId: string, body: string) => void;
  markRead: (chatId: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function subscribeClient() {
  return () => {};
}

export function useIsClient() {
  return useSyncExternalStore(subscribeClient, () => true, () => false);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const username = session?.user?.name ?? undefined;

  const profileSnapshot = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getServerSnapshot,
  );
  const questsSnapshot = useSyncExternalStore(
    subscribeQuests,
    getQuestsSnapshot,
    getServerSnapshot,
  );
  const chatsSnapshot = useSyncExternalStore(
    subscribeChats,
    getChatsSnapshot,
    getServerSnapshot,
  );
  const profile = useMemo(() => profileFromSnapshot(profileSnapshot), [profileSnapshot]);
  const quests = useMemo(() => questsFromSnapshot(questsSnapshot), [questsSnapshot]);
  const chats = useMemo(() => chatsFromSnapshot(chatsSnapshot), [chatsSnapshot]);

  const saveProfile = useCallback((next: Profile) => {
    writeProfile(sanitizeProfile(next));
  }, []);

  const acceptQuest = useCallback((quest: AcceptedQuest) => {
    writeQuests([quest, ...readQuests()]);
    const chat = buildQuestChat(quest, displayName(profile, username));
    const existing = readChats().filter((item) => item.id !== chat.id);
    writeChats([chat, ...existing]);
    return chat.id;
  }, [profile, username]);

  const sendMessage = useCallback((chatId: string, body: string) => {
    const text = body.trim();
    if (!text) return;
    const message = messageFromYou(text, displayName(profile, username));
    writeChats(
      readChats().map((chat) =>
        chat.id === chatId
          ? { ...chat, unread: 0, messages: [...chat.messages, message] }
          : chat,
      ),
    );
  }, [profile, username]);

  const markRead = useCallback((chatId: string) => {
    const chats = readChats();
    const target = chats.find((chat) => chat.id === chatId);
    if (!target || target.unread === 0) return;
    writeChats(chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)));
  }, []);

  const value = useMemo(
    () => ({ profile, quests, chats, saveProfile, acceptQuest, sendMessage, markRead }),
    [profile, quests, chats, saveProfile, acceptQuest, sendMessage, markRead],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return value;
}
